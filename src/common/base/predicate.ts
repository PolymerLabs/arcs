/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
export type Predicate<T> = (input: T) => boolean;

// static methods that hang off Predicate
// tslint:disable-next-line: no-namespace
export namespace Predicate {
  /** A Predicate that always succeeds */
  export const alwaysTrue = <T>() => true;
  /** A Predicate that always fails */
  export const alwaysFalse = <T>() => false;
  // TODO(lindner) and(..) negate(..) or(..) etc..
}
