// @
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

import {StorageBase, StorageProviderBase} from './storage-provider-base.js';
import {VolatileStorage} from './volatile-storage.js';
import {SyntheticStorage} from './synthetic-storage.js';
import {Id} from '../id.js';
import {Type} from '../type.js';
import {KeyBase} from './key-base.js';
import {Dictionary} from '../hot.js';

// TODO(sjmiles): StorageProviderFactory.register can be used
// to install additional providers, as long as it's invoked
// before any StorageProviderFactory objects are constructed.

const providers = {
  volatile: {storage: VolatileStorage, isPersistent: false},
  synthetic: {storage: SyntheticStorage, isPersistent: false}
};

export class StorageProviderFactory {
  static register(name: string, instance: {storage: Function, isPersistent: boolean}) {
    providers[name] = instance;
  }

  private _storageInstances: Dictionary<{storage: StorageBase, isPersistent: boolean}>;

  constructor(private readonly arcId: Id) {
    this._storageInstances = {};
    Object.keys(providers).forEach(name => {
      const {storage, isPersistent} = providers[name];
      this._storageInstances[name] = {storage: new storage(arcId, this), isPersistent};
    });
  }

  private getInstance(key: string) {
    const instance = this._storageInstances[key.split(':')[0]];
    if (!instance) {
      throw new Error(`unknown storage protocol: ${key}`);
    }
    return instance;
  }

  _storageForKey(key: string): StorageBase {
    if (!key) {
      throw new Error('key is required');
    }
    return this.getInstance(key).storage;
  }

  isPersistent(key): boolean {
    return key && this.getInstance(key).isPersistent;
  }

  async construct(id: string, type: Type, keyFragment: string) : Promise<StorageProviderBase> {
    // TODO(shans): don't use reference mode once adapters are implemented
    return await this._storageForKey(keyFragment).construct(id, type, keyFragment);
  }

  async connect(id: string, type: Type, key: string) : Promise<StorageProviderBase> {
    // TODO(shans): don't use reference mode once adapters are implemented
    return await this._storageForKey(key).connect(id, type, key);
  }

  async connectOrConstruct(id: string, type: Type, key: string) : Promise<StorageProviderBase> {
    const storage = this._storageForKey(key);
    let result = await storage.connect(id, type, key);
    if (result == null) {
      result = await storage.construct(id, type, key);
    }
    return result;
  }

  async baseStorageFor(type: Type, keyString: string) : Promise<StorageProviderBase> {
    return await this._storageForKey(keyString).baseStorageFor(type, keyString);
  }

  baseStorageKey(type: Type, keyString: string) : string {
    return this._storageForKey(keyString).baseStorageKey(type, keyString);
  }

  parseStringAsKey(s: string) : KeyBase {
    return this._storageForKey(s).parseStringAsKey(s);
  }

  newKey(id, associatedKeyFragment) {

  }

  // For testing
  async shutdown(): Promise<void> {
    for (const s of Object.values(this._storageInstances)) {
      await s.storage.shutdown();
    }
  }
}
