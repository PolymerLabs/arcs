import {registerSystemExceptionHandler} from '../arc-exceptions.js';

let exceptions = [];

beforeEach(() => registerSystemExceptionHandler((exception) => exceptions.push(exception)));

afterEach(function () {
  if (exceptions.length > 0) {
    for (const exception of exceptions) {
      this.test.ctx.currentTest.err = exception;
    }
    exceptions = [];
  }
});
