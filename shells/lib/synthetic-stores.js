import {StorageProviderFactory} from '../lib/arcs.js';

const stores = {};

export class SyntheticStores {
  static init(env) {
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
