/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

export class SyntheticStores {
  static get providerFactory() {
    return SyntheticStores._providerFactory || (SyntheticStores._providerFactory = new StorageProviderFactory('shell'));
  }
  static async getArcsStore(storage, arcid) {
    const handleStore = await SyntheticStores.getStore(storage, arcid);
    if (handleStore) {
      const handles = await handleStore.toList();
      const handle = handles[0];
      if (handle) {
        return await SyntheticStores.getHandleStore(handle);
      }
    }
  }
  static async getStore(storage, arcid) {
    return await SyntheticStores.connectToKind('handles', storage, arcid);
  }
  static async connectToKind(kind, storage, arcid) {
    // delimiter problems
    if (storage[storage.length-1] === '/') {
      storage = storage.slice(0, -1);
    }
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
