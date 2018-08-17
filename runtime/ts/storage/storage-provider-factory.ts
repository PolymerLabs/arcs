// @
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

import {InMemoryStorage} from './in-memory-storage';
import {FirebaseStorage} from './firebase-storage';
import {Id} from '../id';

export class StorageProviderFactory {
  _storageInstances: {[index: string]: InMemoryStorage | FirebaseStorage};

  constructor(private readonly arcId:Id) {
    this._storageInstances = {'in-memory': new InMemoryStorage(arcId), 'firebase': new FirebaseStorage(arcId)};
  }

  _storageForKey(key) {
    const protocol = key.split(':')[0];
    return this._storageInstances[protocol];
  }

  async share(id, type, key) {
    return this._storageForKey(key).share(id, type, key);
  }

  async construct(id, type, keyFragment) {
    return this._storageForKey(keyFragment).construct(id, type, keyFragment);
  }

  async connect(id, type, key) {
    return this._storageForKey(key).connect(id, type, key);
  }

  parseStringAsKey(s: string) {
    return this._storageForKey(s).parseStringAsKey(s);
  }

  newKey(id, associatedKeyFragment) {

  }

  // For testing
  shutdown() {
    Object.values(this._storageInstances).map(s => s.shutdown());
  }
}
