/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import {Consumer, Literal} from './hot.js';
import {Arc} from './arc.js';

export interface SerializedPropagatedException extends Literal {
  exceptionType: string;
  cause: {name: string, message: string, stack: string};  // Serialized Error.
  method: string;
  particleId: string;
  particleName?: string;
  stack?: string;
}

/** An exception that is to be propagated back to the host. */
export class PropagatedException extends Error {
  constructor(public cause: Error, public method?: string, public particleId?: string, public particleName?: string) {
    super();
    this.stack += `\nCaused by: ${this.cause.stack}`;
  }

  toLiteral(): SerializedPropagatedException {
    return {
      exceptionType: this.constructor.name,  // The name of this exception's subclass.
      cause: {
        name: this.cause.name,
        message: this.cause.message,
        stack: this.cause.stack,
      },
      method: this.method,
      particleId: this.particleId,
      particleName: this.particleName,
      stack: this.stack,
    };
  }

  static fromLiteral(literal: SerializedPropagatedException) {
    const cause = literal.cause as Error;
    let exception: PropagatedException;
    switch (literal.exceptionType) {
      case AuditException.name:
        exception = new AuditException(cause, literal.method, literal.particleId, literal.particleName);
        break;
      case SystemException.name:
        exception = new SystemException(cause, literal.method, literal.particleId, literal.particleName);
        break;
      case UserException.name:
        exception = new UserException(cause, literal.method, literal.particleId, literal.particleName);
        break;
      case PropagatedException.name:
        exception = new PropagatedException(cause, literal.method, literal.particleId, literal.particleName);
        break;
      default:
        throw new Error(`Unknown exception type: ${JSON.stringify(literal)}`);
    }
    exception.stack = literal.stack;
    return exception;
  }
}

/** An exception thrown in Arcs runtime code. */
export class SystemException extends PropagatedException {
  get message(): string {
    const particleName = this.particleName ? this.particleName : this.particleId;
    return `SystemException: exception ${this.cause.name} raised when invoking system function ${this.method} on behalf of particle ${
        particleName}: ${this.cause.message}`;
  }
}

/** An exception thrown in the user particle code (as opposed to an error in the Arcs runtime). */
export class UserException extends PropagatedException {
  get message(): string {
    const particleName = this.particleName ? this.particleName : this.particleId;
    return `UserException: exception ${this.cause.name} raised when invoking function ${this.method} on particle ${particleName}: ${
        this.cause.message}`;
  }
}

export class AuditException extends PropagatedException {
  get message(): string {
    const particleName = this.particleName ? this.particleName : this.particleId;
    return `AuditException: exception ${this.cause.name} raised when invoking function ${this.method} on particle ${particleName}: ${
      this.cause.message}`;
  }
}

type ExceptionHandler = (arc: Arc, input: Error) => void;

const systemHandlers = <ExceptionHandler[]>[];

export function reportSystemException(arc: Arc, exception: PropagatedException) {
  // TODO: handle reporting of system exceptions that have come from stores.
  // At the moment, a store reporting an exception does not supply the arc that the
  // exception belongs to.
  if (arc == null) {
    return;
  }
  for (const handler of systemHandlers) {
    handler(arc, exception);
  }
}

export function reportGlobalException(arc: Arc, exception: Error) {
  for (const handler of systemHandlers) {
    handler(arc, exception);
  }
}

export function registerSystemExceptionHandler(handler: ExceptionHandler) {
  if (!systemHandlers.includes(handler)) {
    systemHandlers.push(handler);
  }
}

export function removeSystemExceptionHandler(handler: ExceptionHandler) {
  const idx = systemHandlers.indexOf(handler);
  if (idx > -1) {
    systemHandlers.splice(idx, 1);
  }
}

export const defaultSystemExceptionHandler = (arc: Arc, exception: Error) => {
  if (exception instanceof PropagatedException) {
    if (exception.particleName && exception.method) {
      console.log(`Exception in particle '${exception.particleName}', method '${exception.method}'`);
    } else if (exception.particleName) {
      console.log(`Exception in particle '${exception.particleName}', unknown method`);
    } else if (exception.method) {
      console.log(`Exception in unknown particle, method '${exception.method}'`);
    }
  }
  console.log(exception.message);
  arc.dispose();
};

registerSystemExceptionHandler(defaultSystemExceptionHandler);
