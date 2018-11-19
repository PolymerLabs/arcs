// @license
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

import {assert} from '../../../platform/assert-web.js';

// Bulding block for CRDT collections. Tracks the membership (keys) of
// values identified by unique IDs. A value is considered to be part
// of the collection if the set of keys added by calls to
// `add(id, ..., keys)` minus the set of keys removed by calls to
// `remove(id, keys)` is non-empty.
//
// Note: This implementation does not guard against the case of the
// same membership key being added more than once. Don't do that.

export interface ModelValue {
  id: string;
  rawData?: {};
  storageKey?: string;
}

export interface SerializedModelEntry {
  id: string;
  value: ModelValue;
  keys: string[];
}

interface ModelEntry {
  value: ModelValue;
  keys: Set<string>;
}

export class CrdtCollectionModel {
  private items: Map<string, ModelEntry>;

  constructor(model = undefined) {
    // id => {value, Set[keys]}
    this.items = new Map();
    if (model) {
      for (let {id, value, keys} of model) {
        if (!keys) {
          keys = [];
        }
        this.items.set(id, {value, keys: new Set(keys)});
      }
    }
  }
  /**
   * Adds membership, `keys`, of `value` indexed by `id` to this collection.
   * Returns whether the change is effective (`id` is new to the collection,
   * or `value` is different to the value previously stored).
   */
  add(id: string, value, keys: string[]): boolean {
    // Ensure that keys is actually an array, not a single string.
    // TODO(shans): remove this when all callers are implemented in typeScript.
    assert(keys.length > 0 && typeof keys === 'object', 'add requires a list of keys');
    let item = this.items.get(id);
    let effective = false;
    if (!item) {
      item = {value, keys: new Set(keys)};
      this.items.set(id, item);
      effective = true;
    } else {
      let newKeys = false;
      for (const key of keys) {
        if (!item.keys.has(key)) {
          newKeys = true;
        }
        item.keys.add(key);
      }
      if (!this._equals(item.value, value)) {
        assert(newKeys, 'cannot add without new keys. incoming=' + keys.join(',') + ' existing=' + [...item.keys].join(','));
        item.value = value;
        effective = true;
      }
    }
    return effective;
  }

  _equals(value1: string|{}, value2: string|{}) {
    if (Boolean(value1) !== Boolean(value2)) {
      return false;
    }
    if (!value1) {
      return true;
    }
    const type1 = typeof(value1);
    if (type1 !== typeof(value2)) {
      return false;
    }
    if (type1 === 'object') {
      const keys = Object.keys(value1);
      if (keys.length !== Object.keys(value2).length) {
        return false;
      }
      return keys.every(key => this._equals(value1[key], value2[key]));
    }
    return JSON.stringify(value1) === JSON.stringify(value2);
  }

  /**
   * Removes the membership, `keys`, of the value indexed by `id` from this collection.
   * Returns whether the change is effective (the value is no longer present
   * in the collection because all of the keys have been removed).
   */
  remove(id: string, keys: string[]): boolean {
    const item = this.items.get(id);
    if (!item) {
      return false;
    }
    for (const key of keys) {
      item.keys.delete(key);
    }
    const effective = item.keys.size === 0;
    if (effective) {
      this.items.delete(id);
    }
    return effective;
  }

  // [{id, value, keys: []}]
  toLiteral(): SerializedModelEntry[] {
    const result: {id, value, keys}[] = [];
    for (const [id, {value, keys}] of this.items.entries()) {
      result.push({id, value, keys: [...keys]});
    }
    return result;
  }

  toList() {
    return [...this.items.values()].map(item => item.value);
  }

  has(id: string): boolean {
    return this.items.has(id);
  }

  getKeys(id: string): string[] {
    const item = this.items.get(id);
    return item ? [...item.keys] : [];
  }

  getValue(id: string) {
    const item = this.items.get(id);
    return item ? item.value : null;
  }

  get size(): number {
    return this.items.size;
  }
}
