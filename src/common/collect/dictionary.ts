/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import {compareNulls, compareNumbers} from '../base/comparable.js';

/** A light-weight, parameterized key-value store Type */
export interface Dictionary<T> {
  [key: string]: T;
}

// static methods that hang off Predicate
// tslint:disable-next-line: no-namespace
export namespace Dictionary {

  /**
   * Compare two Dictionary objects based on the supplied Predicate.
   */
  export const compare = <T>(o1: Dictionary<T>|null, o2: Dictionary<T>|null, compare: (first: T, second: T) => number): number => {
    if (o1 === null || o2 === null) {
      return compareNulls(o1, o2);
    }
    const keys = Object.keys(o1);
    let result: number;
    if ((result = compareNumbers(keys.length, Object.keys(o2).length)) !== 0) return result;
    for (const key of keys) {
      if ((result = compare(o1[key], o2[key])) !== 0) return result;
    }
    return 0;
  };
}
