/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

// Class decorator for installing system tracing capability
// to a class and its subclasses.
// tslint:disable-next-line:enforce-name-casing
export function SystemTrace<T extends {new(...args): {}}>(ctor: T) {
  return class extends ctor {
    constructor(...args) {
      super(...args);
      traceAllFunctions(this);
    }
  };
}

// TODO: dynamic injection of system tracing capabilities

function traceAllFunctions(obj: object) {
  const that: object = obj;
  let properties: string[] = [];

  // Collects all functions at prototype chain.
  while (obj = Object.getPrototypeOf(obj)) {
    if (obj.constructor.name === 'Object') {
      break;
    }
    properties = properties.concat(Object.getOwnPropertyNames(obj));
  }

  // Screens out constructor, duplicate/overridden properties
  // and non-functions if any.
  properties.sort().filter((element, index, array) => {
    if (element !== 'constructor'
        && element !== array[index + 1]
        && typeof that[element] === 'function') {
      return true;
    } else {
      return false;
    }
  });

  // Harnesses system tracing to all functions.
  properties.forEach((element) => {
    const tracedFunction = that[element];

    that[element] = (...args): ReturnType<typeof tracedFunction> => {
      // TODO: async trace begin
      const ret = tracedFunction.call(that, ...args);
      // TODO: async trace end
      return ret;
    };
  });
}
