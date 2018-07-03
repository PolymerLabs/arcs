// @license
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

import {assert} from '../../platform/assert-web.js';

// Bulding block for CRDT collections. Tracks the membership (keys) of
// values identified by unique IDs. A value is considered to be part
// of the collection if the set of keys added by calls to
// `add(id, ..., keys)` minus the set of keys removed by calls to
// `remove(id, keys)` is non-empty.
//
// Note: This implementation does not guard against the case of the
// same membership key being added more than once. Don't do that.
export class CrdtCollectionModel {
  constructor() {
    // id => {value, Set[keys]}
    this._items = new Map();
  }
  // Adds membership, `keys`, of `value` indexed by `id` to this collection.
  // Returns whether the change is effective (`id` is new to the collection,
  // or `value` is different to the value previously stored).
  add(id, value, keys) {
    assert(keys.length > 0);
    let item = this._items.get(id);
    let effective = false;
    if (!item) {
      item = {value, keys: new Set(keys)};
      this._items.set(id, item);
      effective = true;
    } else {
      for (let key of keys) {
        item.keys.add(key);
      }
      if (JSON.stringify(item.value) != JSON.stringify(value)) {
        item.value = value;
        effective = true;
      }
    }
    return effective;
  }
  // Removes the membership, `keys`, of the value indexed by `id` from this collection.
  // Returns whether the change is effective (the value is no longer present
  // in the collection because all of the keys have been removed).
  remove(id, keys) {
    assert(keys.length > 0);
    let item = this._items.get(id);
    if (!item) {
      return false;
    }
    for (let key of keys) {
      item.keys.delete(key);
    }
    let effective = item.keys.size == 0;
    if (effective) {
      this._items.delete(id);
    }
    return effective;
  }
  toList() {
    return [...this._items.values()].map(item => item.value);
  }
  getKeys(id) {
    let item = this._items.get(id);
    return item ? [...item.keys] : [];
  }
  getValue(id) {
    let item = this._items.get(id);
    return item ? item.value : null;
  }
  get size() {
    return this._items.size;
  }
}