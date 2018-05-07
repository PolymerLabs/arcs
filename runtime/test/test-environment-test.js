import { registerSystemExceptionHandler } from '../arc-exceptions.js';

let exceptions = [];

beforeEach(() => registerSystemExceptionHandler((exception, name, particle) => exceptions.push({exception, name, particle})));

afterEach(function () {
  if (exceptions.length > 0) {
    exceptions.forEach(({exception, name, particle}) => { 
      let error = new Error(`${exception.name} when invoking system function ${name} on behalf of ${particle}`); 
      error.stack = exception.stack;
      this.test.error(error);;
    });
    exceptions = [];
  }
})