// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt
import {assert} from '../../platform/assert-web.js';

export function compareNulls(o1, o2) {
  if (o1 === o2) return 0;
  if (o1 === null) return -1;
  return 1;
}

export function compareStrings(s1: string | null, s2: string | null) {
  if (s1 == null || s2 == null) return compareNulls(s1, s2);
  return s1.localeCompare(s2);
}

export function compareNumbers(n1: number, n2: number) {
  if (n1 == null || n2 == null) return compareNulls(n1, n2);
  return n1 - n2;
}

export function compareBools(b1: boolean | null, b2: boolean | null) {
  if (b1 == null || b2 == null) return compareNulls(b1, b2);
  return Number(b1) - Number(b2);
}

export function compareArrays<a>(a1: a[], a2: a[], compare: (first: a, second: a) => number) {
  assert(a1 != null);
  assert(a2 != null);
  if (a1.length !== a2.length) return compareNumbers(a1.length, a2.length);
  for (let i = 0; i < a1.length; i++) {
    let result;
    if ((result = compare(a1[i], a2[i])) !== 0) return result;
  }
  return 0;
}

export function compareObjects<a>(o1: {[index: string]: a} | null, o2: {[index: string]: a} | null, compare: (first: a, second: a) => number) {
  const keys = Object.keys(o1);
  let result;
  if ((result = compareNumbers(keys.length, Object.keys(o2).length)) !== 0) return result;
  for (const key of keys) {
    if ((result = compare(o1[key], o2[key])) !== 0) return result;
  }
  return 0;
}

export type Comparable = {_compareTo: (other: Comparable) => number};

export function compareComparables(o1: Comparable | null, o2: Comparable | null) {
  if (o1 == null || o2 == null) return compareNulls(o1, o2);
  return o1._compareTo(o2);
}
