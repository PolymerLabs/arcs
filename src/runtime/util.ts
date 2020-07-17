/**
 * @license
 * Copyright (c) 2018 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {assert} from '../platform/assert-web.js';
import {Dictionary} from './hot.js';

/**
 * Returns the set delta between two lists based on direct object comparison.
 */
export function setDiff<T>(from: T[], to: T[]): {add: T[], remove: T[]} {
  const result: {add: T[], remove: T[]} = {add: [], remove: []};
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
  const result: {add: T[], remove: T[]} = {add: [], remove: []};
  const items: Map<U, T> = new Map();
  const fromSet: Map<U, T> = new Map();
  const toSet: Map<U, T> = new Map();

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

/**
 * A hack to ignore a floating promise and bypass the linter. Promises should very rarely be left floating, and when such behaviour is intended,
 * it should be clearly marked as such. See https://tsetse.info/must-use-promises.html for details.
 *
 * TODO: Remove all usages of this function and then delete it.
 */
export function floatingPromiseToAudit<T>(promise: Promise<T>) {}

/**
 * Noop function that can be used to supress the tsetse must-use-promises rule.
 *
 * Example Usage:
 *   async function x() {
 *     await doA();
 *     noAwait(doB());
 *   }
 */
export function noAwait(result: {then: Function}) {}

/**
 * Flat map. Maps every element of the given array using the mapping function
 * provided, then joins all elements together into a single list.
 *
 * Polyfill, replace with native Array.flatMap() once we upgrade to a sufficient
 * version of Nodejs.
 */
export function flatMap<T, U>(array: T[], mapper: (element: T) => U) {
  return [].concat(...array.map(mapper));
}

/** Converts a Map to a Dictionary. */
export function mapToDictionary<T>(map: Map<string, T>): Dictionary<T> {
  const dict = {};
  for (const [k, v] of map) {
    dict[k] = v;
  }
  return dict;
}

/** Recursively delete all fields with the given name. */
// tslint:disable-next-line: no-any
export function deleteFieldRecursively(node: any, field: string) {
  if (node == null || typeof node !== 'object') {
    return;
  }
  if (field in node) {
    delete node[field];
  }
  for (const value of Object.values(node)) {
    deleteFieldRecursively(value, field);
  }
}
