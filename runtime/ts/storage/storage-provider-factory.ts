// @
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

import {InMemoryStorage} from './in-memory-storage';
import {FirebaseStorage} from './firebase-storage';
import {KeyBase} from './key-base';
import {StorageProviderBase} from './storage-provider-base';
import {Type} from '../type';

export class StorageProviderFactory {
  _storageInstances: {[index: string]: InMemoryStorage | FirebaseStorage};

  constructor(private arcId: string) {
    this._storageInstances = {
      'in-memory': new InMemoryStorage(arcId),
      'firebase': new FirebaseStorage(arcId)
    };
  }

  _storageForKey(key: string) {
    const protocol = key.split(':')[0];
    return this._storageInstances[protocol];
  }

  async share(id: string,
              type: Type,
              key: string): Promise<StorageProviderBase> {
    return this._storageForKey(key).share(id, type, key);
  }

  async construct(id: string,
                  type: Type,
                  keyFragment: string): Promise<StorageProviderBase> {
    return this._storageForKey(keyFragment).construct(id, type, keyFragment);
  }

  async connect(id: string,
                type: Type,
                key: string): Promise<StorageProviderBase> {
    return this._storageForKey(key).connect(id, type, key);
  }

  parseStringAsKey(s: string): KeyBase {
    return this._storageForKey(s).parseStringAsKey(s);
  }

  newKey(id: string, associatedKeyFragment: string) {

  }

  // For testing
  async shutdown() {
    await Promise.all(Object.keys(this._storageInstances).map(k => this._storageInstances[k].shutdown()));
  }
}
