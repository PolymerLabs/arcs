import {Particle} from './particle';

/**
 * @license
 * Copyright (c) 2018 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

/** An exception that is to be propagated back to the host. */
export class PropagatedException extends Error {
  constructor(public cause: Error, public method: string, public particleId: string, public particleName?: string) {
    super();
    this.stack = cause.stack;
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
