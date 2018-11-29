import {StorageProviderFactory} from '../env/arcs.js';

const stores = {};

export class SyntheticStores {
  static init(env) {
    SyntheticStores.providerFactory = new StorageProviderFactory('shell');
  }
  static async getStore(storage, id) {
    return stores[id] || (stores[id] = await SyntheticStores.syntheticConnect(storage, id));
  }
  static async syntheticConnect(storage, id) {
    return SyntheticStores.storeConnect(null, SyntheticStores.getSyntheticArcsStorageKey(storage, id));
  }
  static async storeConnect(type, storageKey) {
    return SyntheticStores.providerFactory.connect(SyntheticStores.makeId(), type, storageKey);
  }
  static makeId() {
    return `id${Math.random()}`;
  }
  static getSyntheticArcsStorageKey(storage, arcid) {
    return `synthetic://arc/handles/${storage}/${arcid}`;
  }
  static async getHandleStore({type, storageKey}) {
    return stores[storageKey] || (stores[storageKey] = await SyntheticStores.storeConnect(type, storageKey));
  }
  static snarfId(key) {
    return key.split('/').pop();
  }
}
