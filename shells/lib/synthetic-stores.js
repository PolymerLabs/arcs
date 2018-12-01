import {StorageProviderFactory} from '../env/arcs.js';

const stores = {};

export class SyntheticStores {
  static init(env) {
    SyntheticStores.providerFactory = new StorageProviderFactory('shell');
  }
  static async getStore(storage, id) {
    //return stores[id] || (stores[id] = await SyntheticStores.syntheticConnect(storage, id));
    return stores[id] || (stores[id] = await SyntheticStores.syntheticConnectKind('handles', storage, id));
  }
  static async syntheticConnectKind(kind, storage, arcid) {
    const key = `synthetic://arc/${kind}/${storage}/${arcid}`;
    return SyntheticStores.storeConnect(null, key);
  }
  //static async syntheticConnect(storage, id) {
  //  return SyntheticStores.storeConnect(null, SyntheticStores.getSyntheticHandlesStorageKey(storage, id));
  //}
  //static getSyntheticHandlesStorageKey(storage, arcid) {
  //  return `synthetic://arc/handles/${storage}/${arcid}`;
  //}
  static async getSerialization(storage, id) {
        const key = `${storage}/${arcid}/arc-info`;
    const store = await SyntheticStores.providerFactory.connect('id', Type.newArcInfo(), key);
    if (store) {
      const info = await store.get();
      return info && info.serialization;
    }
    return stores[id] || (stores[id] = await SyntheticStores.syntheticConnectKind('arc-info', storage, id));
  }
  static async getHandleStore(handle) {
    const {type, storageKey} = handle;
    return await SyntheticStores.storeConnect(type, storageKey);
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
