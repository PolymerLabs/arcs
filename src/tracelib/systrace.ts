/**
 * @license
 * Copyright 2020 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {Client, getClientClass} from './systrace-clients.js';

/** Interface that describes a traced symbol. */
interface Symbol {
  className: string;
  prototype: Function;
  property: string;
  tag: string;
}

type Constructor<T> = new (...args) => T;

// Identifies whether a class has already been traced in its
// inheritance hierarchies.
const SYSTEM_TRACED_PROPERTY = '_systemTraced';

// Specifies the functions of a prototype/constructor not being traced.
const NO_TRACE_PROPERTY = '_noTrace';

// Don't trace these [class]: properties
//
// Works jointly with @NoTrace{WithReason} which is used when modifying source
// codes is allowed, whereas using this blacklist when modifying source codes in
// i.e. third-party libraries is forbidden. The list is usually used to shut up
// chatty trace messages on third-party class methods.
const PROPERTY_BLACKLIST = new Map(
    // [['Foo', ['bar', 'xyz']],]
);

// Generates unique ids and cookies to identify tracing sessions or function
// calls among execution contexts (main runtime, dedicated workers and etc).
const idGenerator = new class {
  private cookie: number = Date.now() & 0x7FFFFFFF;
  private id: string = Math.random().toString(36).substr(2, 9);

  /**
   * An id is used to identify execution context.
   *
   * Relies on v8 pseudo-random number generator (PRNG).
   * The random number is derived from an internal state, which is altered by
   * a fixed algorithm for every new random number.
   */
  getUniqueId(): string {
    return this.id;
  }

  /**
   * A cookie is a rolling sequence being used to identify an unique
   * asynchronous tracing session or function call.
   */
  getCookie(): number {
    const cookie = this.cookie++;
    this.cookie &= 0x7FFFFFFF;
    return cookie;
  }
}();

/**
 * Method decorator for specifying that don't harness system trace
 * to this method with a reason.
 */
export function NoTraceWithReason(reason: string = '') {
  return function _(
      target: object, property: string, descriptor: PropertyDescriptor) {
    if (!target.hasOwnProperty(NO_TRACE_PROPERTY)) {
      Object.defineProperty(target, NO_TRACE_PROPERTY, {value: [property]});
    } else {
      target[NO_TRACE_PROPERTY].push(property);
    }
  };
}

/**
 * Method decorator for specifying that don't harness system trace
 * to this method.
 */
// tslint:disable-next-line: variable-name
export const NoTrace = NoTraceWithReason();

/**
 * Class decorator for installing system tracing capability
 * to a class and its subclasses.
 */
// tslint:disable-next-line:enforce-name-casing
export function SystemTrace<T extends Constructor<{}>>(ctor: T) {
  return class extends ctor {
    constructor(...args) {
      super(...args);
      const clientClass: ReturnType<typeof getClientClass> = getClientClass();

      // Don't harness system tracing when any of:
      // a) clientClass is undefined, namely system tracing is not requested
      //    via url parameter.
      // b) re-entrance is detected.
      if (clientClass &&
          !this.constructor.hasOwnProperty(SYSTEM_TRACED_PROPERTY)) {
        // tslint:disable-next-line: no-any
        harnessSystemTracing(this, new (clientClass as any)());
      }
    }
  };
}

/**
 * Used at sources that cannot decorate class by @SystemTrace.
 * Extends SystemTraceable to declare your class system-traceable,
 * e.g. class Foo extends SystemTraceable {...}
 */
// tslint:disable-next-line: variable-name
export const SystemTraceable = SystemTrace(class {});

/**
 * Used at sources that cannot decorate class by @SystemTrace.
 * Extends makeSystemTraceable(Base) to inherit from a system-traceable Base,
 * e.g. class Foo extends makeSystemTraceable(Base) {...}
 */
export function makeSystemTraceable<T extends Constructor<{}>>(cls: T) {
  return SystemTrace(cls);
}

function isFunction(target: object | Function, property: string): boolean {
  const desc = Object.getOwnPropertyDescriptor(target, property);
  // Type Function and non-getter/setter
  return (!desc.get && !desc.set && typeof desc.value === 'function');
}

function harnessSystemTracing(obj: object, client: Client) {
  const that: object = obj;
  const contextId: string = idGenerator.getUniqueId();
  let boundSymbols: Symbol[] = [];

  // Collects all functions at the object's prototype chain.
  while ((obj = Object.getPrototypeOf(obj))) {
    // Stops at the root of the prototype chain.
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

    const classTagName = obj.constructor.name || 'anon';

    // Collects and binds instance functions
    boundSymbols = boundSymbols.concat(
        Object.getOwnPropertyNames(obj)
            .filter((element, index, array) => {
              return isFunction(obj, element);
            })
            .map(element => ({
              className: obj.constructor.name,
              prototype: obj as Function,  // Foo.prototype
              property: element,
              // Places contextId first to group visual results in catapult.
              tag: contextId + '::' + classTagName + '::' + element,
            })));

    // Collects and binds class static functions
    boundSymbols = boundSymbols.concat(
        Object.getOwnPropertyNames(obj.constructor)
            .filter((element, index, array) => {
              return isFunction(obj.constructor, element);
            })
            .map(element => ({
              className: obj.constructor.name,
              prototype: obj.constructor,  // Foo.prototype.constructor
              property: element,
              tag: contextId + '::' + classTagName + '::' + element,
            })));
  }

  // Property filters (determine if harnessing system tracing to properties):
  boundSymbols = boundSymbols.filter((element, index, array) => {
    const desc =
        Object.getOwnPropertyDescriptor(element.prototype, element.property);
    // Not interested in properties that can not be changed.
    if (!desc.writable) {
      return false;
    }
    // Not interested in constructors at this moment.
    if (element.property === 'constructor') {
      return false;
    }
    // Skips tracing when a function is decorated with @NoTrace.
    const props = element.prototype[NO_TRACE_PROPERTY];
    if (props && props.indexOf(element.property) !== -1) {
      return false;
    }
    // Skips tracing on blacklisted properties.
    const cls = PROPERTY_BLACKLIST.get(element.className);
    if (cls && cls.indexOf(element.property) !== -1) {
      return false;
    }
    return true;
  });

  // Harnesses system tracing to all property candidates.
  boundSymbols.forEach((element) => {
    const tracedFunction = element.prototype[element.property];
    element.prototype[element.property] =
        function(...args): ReturnType<typeof tracedFunction> {
          const cookie = idGenerator.getCookie();
          client.asyncTraceBegin(element.tag, cookie);
          const ret = tracedFunction.call(this, ...args);
          client.asyncTraceEnd(element.tag, cookie);
          return ret;
        };
  });
}
