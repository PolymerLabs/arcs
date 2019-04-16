/*
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {StorageProviderFactory} from '../../../build/runtime/storage/storage-provider-factory.js';

//const stores = {};

export class SyntheticStores {
  static init() {
    if (!SyntheticStores.providerFactory) {
      SyntheticStores.providerFactory = new StorageProviderFactory('shell');
    }
  }
  static async getArcsStore(storage, name) {
    const handleStore = await SyntheticStores.getStore(storage, name);
    if (handleStore) {
      const handles = await handleStore.toList();
      const handle = handles[0];
      if (handle) {
        return await SyntheticStores.getHandleStore(handle);
      }
    }
  }
  static async getStore(storage, id) {
    // cached stores can be incorrect?
    //return stores[id] || (stores[id] = await SyntheticStores.syntheticConnectKind('handles', storage, id));
    return await SyntheticStores.connectToKind('handles', storage, id);
  }
  static async connectToKind(kind, storage, arcid) {
    return SyntheticStores.storeConnect(null, `synthetic://arc/${kind}/${storage}/${arcid}`);
  }
  static async getHandleStore(handle) {
    return await SyntheticStores.storeConnect(handle.type, handle.storageKey);
  }
  static async storeConnect(type, storageKey) {
    return SyntheticStores.providerFactory.connect(SyntheticStores.makeId(), type, storageKey);
  }
  static makeId() {
    return `id${Math.random()}`;
  }
  static snarfId(key) {
    return key.split('/').pop();
  }
}
