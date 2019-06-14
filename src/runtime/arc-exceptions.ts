/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import {Particle} from './particle';
import {Literal} from './hot.js';

/**
 * @license
 * Copyright (c) 2018 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

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
  constructor(public cause: Error, public method: string, public particleId: string, public particleName?: string) {
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
      case SystemException.name:
        exception = new SystemException(cause, literal.method, literal.particleId, literal.particleName);
        break;
      case UserException.name:
        exception = new UserException(cause, literal.method, literal.particleId, literal.particleName);
        break;
      default:
        throw new Error(`Unknown exception type: ${literal.exceptionType}`);
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

type ExceptionHandler = (exception: PropagatedException) => void;

const systemHandlers = <ExceptionHandler[]>[];

export function reportSystemException(exception: PropagatedException) {
  for (const handler of systemHandlers) {
    handler(exception);
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

registerSystemExceptionHandler((exception) => {
  console.log(exception.method, exception.particleName);
  throw exception;
});
