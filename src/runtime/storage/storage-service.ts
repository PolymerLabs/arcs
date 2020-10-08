/**
 * @license
 * Copyright 2020 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import {CRDTTypeRecord} from '../../crdt/internal/crdt.js';
import {CRDTMuxEntity, TypeToCRDTTypeRecord, CRDTTypeRecordToType} from './storage.js';
import {ProxyMessage} from './store-interface.js';
import {ActiveStore} from './active-store.js';
import {Type} from '../../types/lib-types.js';
import {noAwait} from '../../utils/lib-utils.js';
import {StoreInfo} from './store-info.js';
import {StorageKey} from './storage-key.js';
import {Exists} from './drivers/driver.js';

export type StorageServiceCallback = (data: {}) => void;

export interface StorageService {
  onRegister(store: ActiveStore<CRDTTypeRecord>,
    messagesCallback: StorageServiceCallback,
    idCallback: StorageServiceCallback);

  onDirectStoreMuxerRegister(store: ActiveStore<CRDTMuxEntity>,
    messagesCallback: StorageServiceCallback,
    idCallback: StorageServiceCallback);

  onProxyMessage(store: ActiveStore<CRDTTypeRecord>, message: ProxyMessage<CRDTTypeRecord>);
  onStorageProxyMuxerMessage(store: ActiveStore<CRDTMuxEntity>, message: ProxyMessage<CRDTMuxEntity>);

  getActiveStore<T extends Type>(storeInfo: StoreInfo<T>): Promise<ActiveStore<TypeToCRDTTypeRecord<T>>>;
}

export class StorageServiceImpl implements StorageService {
  // All the stores, mapped by store ID
  private readonly activeStoresByKey = new Map<StorageKey, ActiveStore<CRDTTypeRecord>>();

  async onRegister(store: ActiveStore<CRDTTypeRecord>, messagesCallback: StorageServiceCallback, idCallback: StorageServiceCallback) {
    // TODO: add listener removal callback to storageListenerRemovalCallbacks
    //       for StorageNG if necessary.
    const id = store.on(async data => {
      messagesCallback(data);
    });
    idCallback(id);
  }

  async onDirectStoreMuxerRegister(store: ActiveStore<CRDTMuxEntity>,
    messagesCallback: StorageServiceCallback,
    idCallback: StorageServiceCallback) {
      const id = store.on(async data => {
        messagesCallback(data);
      });
      idCallback(id);
    }

  async onProxyMessage(store: ActiveStore<CRDTTypeRecord>, message: ProxyMessage<CRDTTypeRecord>) {
    return store.onProxyMessage(message);
  }

  async onStorageProxyMuxerMessage(store: ActiveStore<CRDTMuxEntity>, message: ProxyMessage<CRDTMuxEntity>) {
    return store.onProxyMessage(message);
  }

  async getActiveStore<T extends Type>(storeInfo: StoreInfo<T>): Promise<ActiveStore<TypeToCRDTTypeRecord<T>>> {
    if (this.activeStoresByKey.has(storeInfo.storageKey)) {
      return this.activeStoresByKey.get(storeInfo.storageKey) as ActiveStore<TypeToCRDTTypeRecord<T>>;
    }
    if (ActiveStore.constructors.get(storeInfo.mode) == null) {
      throw new Error(`StorageMode ${storeInfo.mode} not yet implemented`);
    }
    const constructor = ActiveStore.constructors.get(storeInfo.mode);
    if (constructor == null) {
      throw new Error(`No constructor registered for mode ${storeInfo.mode}`);
    }
    const activeStore = await constructor.construct<TypeToCRDTTypeRecord<T>>({
      storageKey: storeInfo.storageKey,
      exists: storeInfo.exists,
      type: storeInfo.type as unknown as CRDTTypeRecordToType<TypeToCRDTTypeRecord<T>>,
      storeInfo: storeInfo as unknown as StoreInfo<CRDTTypeRecordToType<TypeToCRDTTypeRecord<T>>>,
    }) as ActiveStore<TypeToCRDTTypeRecord<T>>;
    storeInfo.exists = Exists.ShouldExist;
    this.activeStoresByKey.set(storeInfo.storageKey, activeStore);
    return activeStore;
  }
}
