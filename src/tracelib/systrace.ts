/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {Client, getClientClass} from './systrace-clients.js';

/** Interface that describes a traced symbol. */
interface Symbol {
  target: object | Function;
  prototype: Function;
  property: string;
  tag: string;
}

// Identifies whether a class has already been traced in any of its
// inheritance hierarchies.
const SYSTEM_TRACED_PROPERTY = '_systemTraced';

// Determines the client class asap at the very first script evaluation.
const clientClass: ReturnType<typeof getClientClass> = getClientClass();

// Generates unique ids and cookies to identify tracing sessions or function
// calls among contexts and tracing sessions or function calls.
const idGenerator = new class {
  private cookie: number = Date.now();

  /**
   * An id is used to identify execution context (main runtime, workers, etc).
   *
   * Relies on v8 pseudo-random number generator (PRNG).
   * The random number is derived from an internal state, which is altered by
   * a fixed algorithm for every new random number.
   */
  getUniqueId(): string {
    return '::' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * A cookie is a rolling sequence being used to identify an unique
   * asynchronous tracing session or function call.
   */
  getCookie(): number {
    return this.cookie++;
  }
}();

/**
 * Class decorator for installing system tracing capability
 * to a class and its subclasses.
 */
// tslint:disable-next-line:enforce-name-casing
export function SystemTrace<T extends {new(...args): {}}>(ctor: T) {
  if (!clientClass) {
    // Do not change any bit of contracts at the decorated class when
    // system tracing is disabled (no &systrace url parameter specified).
    return ctor;
  } else {
    return class extends ctor {
      constructor(...args) {
        super(...args);
        // Stops re-entrance of harnessing system tracing
        if (!this.constructor.hasOwnProperty(SYSTEM_TRACED_PROPERTY)) {
          harnessSystemTracing(this, new clientClass());
        }
      }
    };
  }
}

function harnessSystemTracing(obj: object, client: Client) {
  const that: object = obj;
  const contextId: string = idGenerator.getUniqueId();
  let boundSymbols: Symbol[] = [];

  // Collects all functions at the object's prototype chain.
  while (obj = Object.getPrototypeOf(obj)) {
    if (obj.constructor.name === 'Object') {
      break;
    }

    // Don't harness system tracing to the harnessed classes.
    // Class inheritance hierarchy might has the partial of super-classes
    // that have already been harnessed.
    if (obj.constructor.hasOwnProperty(SYSTEM_TRACED_PROPERTY)) {
      continue;
    }
    Object.defineProperty(
        obj.constructor,
        SYSTEM_TRACED_PROPERTY,
        {value: true, writable: false});

    // Collects and binds instance functions
    boundSymbols = boundSymbols.concat(
        Object.getOwnPropertyNames(obj)
            .filter((element, index, array) => {
              return typeof obj[element] === 'function';
            })
            .map(element => ({
                   target: that,
                   prototype: obj as Function,  // Foo.prototype
                   property: element,
                   tag: 'o' + obj.constructor.name + '::' + element + contextId,
                 })));

    // Collects and binds class static functions
    boundSymbols = boundSymbols.concat(
        Object.getOwnPropertyNames(obj.constructor)
            .filter((element, index, array) => {
              return typeof obj.constructor[element] === 'function';
            })
            .map(element => ({
                   target: obj.constructor,
                   prototype: obj.constructor,  // Foo.prototype.constructor
                   property: element,
                   tag: 's' + obj.constructor.name + '::' + element + contextId,
                 })));
  }

  // Property filters (don't harness system tracing to):
  boundSymbols = boundSymbols.filter(
      (element, index, array) => element.property !== 'constructor');

  // Harnesses system tracing to all property candidates.
  boundSymbols.forEach((element) => {
    const tracedFunction = element.prototype[element.property];
    element.prototype[element.property] =
        (...args): ReturnType<typeof tracedFunction> => {
          const cookie = idGenerator.getCookie();
          client.asyncTraceBegin(element.tag, cookie);
          const ret = tracedFunction.call(element.target, ...args);
          client.asyncTraceEnd(element.tag, cookie);
          return ret;
        };
  });
}
