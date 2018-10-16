// @license
// Copyright (c) 2018 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

import {assert} from '../../platform/assert-web.js';

/**
 * Returns the set delta between two lists based on direct object comparison.
 */
export function setDiff<T>(from: T[], to: T[]): {add: T[], remove: T[]} {
  const result = {add: [], remove: []};
  const items = new Set([...from, ...to]);
  const fromSet = new Set(from);
  const toSet = new Set(to);
  for (const item of items) {
    if (fromSet.has(item)) {
      if (toSet.has(item)) {
        continue;
      }
      result.remove.push(item);
      continue;
    }
    assert(toSet.has(item));
    result.add.push(item);
  }
  return result;
}

/**
 * Returns the set delta between two lists based on custom object comparison.
 * `keyFn` takes type T and returns the value by which items should be compared.
 */
export function setDiffCustom<T, U>(from: T[], to: T[], keyFn: (T) => U): {add: T[], remove: T[]} {
  const result = {add: [], remove: []};
  const items = new Map();
  const fromSet = new Map();
  const toSet = new Map();

  for (const item of from) {
    const key = keyFn(item);
    items.set(key, item);
    fromSet.set(key, item);
  }
  for (const item of to) {
    const key = keyFn(item);
    items.set(key, item);
    toSet.set(key, item);
  }

  for (const [key, item] of items) {
    if (fromSet.has(key)) {
      if (toSet.has(key)) {
        continue;
      }
      result.remove.push(item);
      continue;
    }
    assert(toSet.has(key));
    result.add.push(item);
  }
  return result;
}
