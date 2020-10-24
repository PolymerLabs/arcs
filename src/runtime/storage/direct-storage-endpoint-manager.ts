/**
 * @license
 * Copyright 2020 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import {assert} from '../../platform/assert-web.js';
import {CRDTTypeRecord} from '../../crdt//lib-crdt.js';
import {TypeToCRDTTypeRecord, CRDTTypeRecordToType} from './storage.js';
import {ProxyMessage} from './store-interface.js';
import {ActiveStore} from './active-store.js';
import {Type} from '../../types/lib-types.js';
import {StoreInfo} from './store-info.js';
import {StorageKey} from './storage-key.js';
import {Exists} from './drivers/driver.js';
import {StorageService} from './storage-service.js';
import {Consumer} from '../../utils/lib-utils.js';
import {StorageEndpointManager} from './storage-manager.js';

export class DirectStorageEndpointManager implements StorageEndpointManager, StorageService {
  // All the stores, mapped by store ID
  private readonly activeStoresByKey = new Map<StorageKey, ActiveStore<CRDTTypeRecord>>();

  get storageService() { return this;}

  async getActiveStore<T extends Type>(storeInfo: StoreInfo<T>): Promise<ActiveStore<TypeToCRDTTypeRecord<T>>> {
    if (!this.activeStoresByKey.has(storeInfo.storageKey)) {
      if (ActiveStore.constructors.get(storeInfo.mode) == null) {
        throw new Error(`StorageMode ${storeInfo.mode} not yet implemented`);
      }
      const ctor = ActiveStore.constructors.get(storeInfo.mode);
      if (ctor == null) {
        throw new Error(`No constructor registered for mode ${storeInfo.mode}`);
      }
      this.activeStoresByKey.set(storeInfo.storageKey, await ctor.construct<TypeToCRDTTypeRecord<T>>({
        storageKey: storeInfo.storageKey,
        exists: storeInfo.exists,
        type: storeInfo.type as unknown as CRDTTypeRecordToType<TypeToCRDTTypeRecord<T>>,
        storeInfo: storeInfo as unknown as StoreInfo<CRDTTypeRecordToType<TypeToCRDTTypeRecord<T>>>,
      }));
      storeInfo.exists = Exists.ShouldExist;
    }
    return this.activeStoresByKey.get(storeInfo.storageKey) as ActiveStore<TypeToCRDTTypeRecord<T>>;
  }

  async onRegister(storeInfo: StoreInfo<Type>, messagesCallback: Consumer<{}>, idCallback: Consumer<{}>) {
    const store = await this.getActiveStore(storeInfo);
    const id = store.on(async data => {
      messagesCallback(data);
    });
    idCallback(id);
  }
  async onProxyMessage(storeInfo: StoreInfo<Type>, message: ProxyMessage<CRDTTypeRecord>) {
    return (await this.getActiveStore(storeInfo)).onProxyMessage(message);
  }
}
