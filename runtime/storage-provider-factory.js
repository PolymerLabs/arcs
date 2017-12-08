// @
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt
'use strict';

import InMemoryStorage from './in-memory-storage.js';

class StorageProviderFactory {
  constructor(arc) {
    this._arc = arc;
    this.storageInstances = {'in-memory': new InMemoryStorage(arc)};
  }

  _storageForKey(key) {
    var protocol = keyFragment.split(':')[0];
    return this.storageInstances[protocol];
  }

  construct(id, type, keyFragment) {
    this._storageForKey(keyFragment).construct(id, type, keyFragment);
  }

  connect(id, type, key) {
    this._storageForKey(key).connect(id, type, keyFragment);
  }

  newKey(id, associatedKeyFragment) {

  }
}
