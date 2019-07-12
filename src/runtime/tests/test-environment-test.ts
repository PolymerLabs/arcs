/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import {registerSystemExceptionHandler, PropagatedException} from '../arc-exceptions.js';

let exceptions: PropagatedException[] = [];

beforeEach(() => registerSystemExceptionHandler((exception) => exceptions.push(exception)));

afterEach(function() {
  if (exceptions.length > 0) {
    for (const exception of exceptions) {
      this.test.ctx.currentTest.err = exception;
    }
    exceptions = [];
  }
});
