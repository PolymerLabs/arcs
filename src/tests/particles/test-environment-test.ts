/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import {registerSystemExceptionHandler, removeSystemExceptionHandler, defaultSystemExceptionHandler} from '../../runtime/arc-exceptions.js';

let exceptions: Error[] = [];

before(() => {
  removeSystemExceptionHandler(defaultSystemExceptionHandler);
  registerSystemExceptionHandler((arc, exception) => exceptions.push(exception));
});

afterEach(function() {
  if (exceptions.length > 0) {
    const exception = exceptions[0];
    exceptions = [];
    // Error function not yet included in mocha typescript declarations...
    this.test['error'](exception);
  }
});
