// @
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt
'use strict';

import {InMemoryStorage} from './in-memory-storage.js';
import {FirebaseStorage} from './firebase-storage.js';

export class StorageProviderFactory {
  constructor(arcId) {
    this._arcId = arcId;
    this._storageInstances = {'in-memory': new InMemoryStorage(arcId), 'firebase': new FirebaseStorage(arcId)};
  }

  _storageForKey(key) {
    let protocol = key.split(':')[0];
    return this._storageInstances[protocol];
  }

  async construct(id, type, keyFragment) {
    return this._storageForKey(keyFragment).construct(id, type, keyFragment);
  }

  async connect(id, type, key) {
    return this._storageForKey(key).connect(id, type, key);
  }

  parseStringAsKey(string) {
    return this._storageForKey(string).parseStringAsKey(string);
  }

  newKey(id, associatedKeyFragment) {

  }
}
