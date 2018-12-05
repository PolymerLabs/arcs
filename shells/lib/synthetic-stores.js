import {StorageProviderFactory} from '../env/arcs.js';

const stores = {};

export class SyntheticStores {
  static init(env) {
    SyntheticStores.providerFactory = new StorageProviderFactory('shell');
  }
  static async getStore(storage, id) {
    return stores[id] || (stores[id] = await SyntheticStores.syntheticConnectKind('handles', storage, id));
  }
  static async syntheticConnectKind(kind, storage, arcid) {
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
