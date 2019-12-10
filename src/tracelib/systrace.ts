/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {getClientClass, Client} from './systrace-clients.js';

// Describes a traced symbol.
interface Symbol {
  target: object | Function;
  symbol: string;
}

// Determines the client class asap at the very first script evaluation.
const clientClass: ReturnType<typeof getClientClass> = getClientClass();

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
        traceAllFunctions(this, new clientClass());
      }
    };
  }
}

// TODO: dynamic injection of system tracing capabilities

function traceAllFunctions(obj: object, client: Client) {
  const that: object = obj;
  let boundSymbols: Symbol[] = [];

  // Collects all functions at the object's prototype chain.
  while (obj = Object.getPrototypeOf(obj)) {
    if (obj.constructor.name === 'Object') {
      break;
    }
    // Collects and binds instance functions
    boundSymbols = boundSymbols.concat(
        Object.getOwnPropertyNames(obj)
            .filter((element, index, array) => {
              return typeof obj[element] === 'function';
            })
            .map(element => ({target: that, symbol: element})));
    // Collects and binds class static functions
    boundSymbols = boundSymbols.concat(
        Object.getOwnPropertyNames(obj.constructor)
            .filter((element, index, array) => {
              return typeof obj.constructor[element] === 'function';
            })
            .map(element => ({target: obj.constructor, symbol: element})));
  }

  // Sorts by symbols so as to remove duplicate properties later.
  boundSymbols = boundSymbols.sort((element1, element2) => {
    if (element1.symbol > element2.symbol) return 1;
    else if (element1.symbol < element2.symbol) return -1;
    else return 0;
  });

  // Filters out (don't harness system tracing to):
  // a) constructors
  // b) duplicate/overridden properties
  //
  // In reverse order to ensure keeping the innermost methods overriding
  // their super-classes.
  boundSymbols = boundSymbols.reverse().filter((element, index, array) => {
    const next = array[index + 1];
    if (element.symbol === 'constructor' ||
        (next && element.symbol === next.symbol)) {
      return false;
    }
    return true;
  });

  // Harnesses system tracing to all candidates.
  boundSymbols.forEach((element) => {
    const tracedFunction = element.target[element.symbol];
    element.target[element.symbol] =
        (...args): ReturnType<typeof tracedFunction> => {
          // TODO: async trace begin
          const ret = tracedFunction.call(element.target, ...args);
          // TODO: async trace end
          return ret;
        };
  });
}
