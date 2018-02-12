// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

// A trivially simple fake database to stub out interactions with a Firebase
// database store globally defined under the `db` symbol.
//
// TODO(wkorman): Currently there's no real support for retrieving values other
// than via #lastUpdate. We could consider using something like the
// firebase-mock-v3 npm package instead, or, further enhance this fake.
class FakeDatabase {
  constructor(key, data) {
    this.reset();
    if (key) this._key = key;
    if (data) this._data = data;
  }
  child(key) {
    if (!this._fakeChildren[key])
      this._fakeChildren[key] = new FakeDatabase(
        this._key + '/' + key,
        this._data[key]
      );
    return this._fakeChildren[key];
  }
  on() {}
  off() {}
  push(values) {
    const newKey = FakeDatabase.nextId();
    this._data[newKey] = values;
    return { key: newKey };
  }
  update(values) {
    this._lastUpdate = values;
  }
  reset() {
    this._key = 0;
    this._data = {};
    FakeDatabase._nextKey = 1;
    this._lastUpdate = undefined;
    this._fakeChildren = {};
  }
  get lastUpdate() {
    return this._lastUpdate;
  }

  static nextId() {
    return FakeDatabase._nextKey++;
  }
}

FakeDatabase._nextKey = 1;

const db = new FakeDatabase();
