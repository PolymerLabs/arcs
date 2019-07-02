/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */


// TODO(lindner): move the utility code outside, break dep on Dictionary
import {Dictionary} from '../collect/dictionary.js';
import {checkDefined} from './preconditions.js';

/**
 * @fileoverview Utility code to compare objects and primitives.
 */

// TODO(lindner): this needs some work to make it more like the java
// comparable interface or python __lt__

export interface Comparable<T> {
  _compareTo<T>(other: Comparable<T>): number;
}


export function compareNulls<T>(o1: T | null, o2: T | null): number {
  if (o1 === o2) return 0;
  if (o1 === null) return -1;
  return 1;
}

export function compareStrings(s1: string | null, s2: string | null): number {
  if (s1 == null || s2 == null) return compareNulls<string>(s1, s2);
  return s1.localeCompare(s2);
}

export function compareNumbers(n1: number | null, n2: number | null): number {
  if (n1 === null || n2 === null) return compareNulls<number>(n1, n2);
  return n1 - n2;
}

export function compareBools(b1: boolean | null, b2: boolean | null): number {
  if (b1 === null || b2 === null) return compareNulls<boolean>(b1, b2);
  return Number(b1) - Number(b2);
}

export function compareArrays<T>(arr1: T[]|null, arr2: T[]|null, compare: (first: T, second: T) => number): number {
  const a1 = checkDefined(arr1);
  const a2 = checkDefined(arr2);
  
  if (a1.length !== a2.length) return compareNumbers(a1.length, a2.length);
  for (let i = 0; i < a1.length; i++) {
    let result: number;
    if ((result = compare(a1[i], a2[i])) !== 0) return result;
  }
  return 0;
}

export function compareComparables<T>(o1: Comparable<T> | null, o2: Comparable<T> | null): number {
  // TODO(lindner): convert to triple-equals once we know why this is being called with undefined
  // values
  if (o1 == null || o2 == null) return compareNulls(o1, o2);

  return o1._compareTo(o2);
}

