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
import {TypeToCRDTTypeRecord, CRDTTypeRecordToType, MuxEntityType, ToHandle, CRDTMuxEntity} from './storage.js';
import {ProxyMessage, StorageCommunicationEndpoint} from './store-interface.js';
import {ActiveStore} from './active-store.js';
import {Type} from '../../types/lib-types.js';
import {StoreInfo} from './store-info.js';
import {StorageKey} from './storage-key.js';
import {Exists} from './drivers/driver.js';
import {StorageService, HandleOptions} from './storage-service.js';
import {Consumer} from '../../utils/lib-utils.js';
import {DirectStorageEndpoint} from './direct-storage-endpoint.js';
import {DriverFactory} from './drivers/driver-factory.js';
import {StorageKeyParser} from './storage-key-parser.js';
import {MuxType, SingletonType} from '../../types/lib-types.js';
import {SingletonHandle, CollectionHandle} from './handle.js';
import {EntityHandleFactory} from './entity-handle-factory.js';
import {StorageProxyMuxer} from './storage-proxy-muxer.js';
import {IdGenerator} from '../id.js';
import {StorageProxy} from './storage-proxy.js';
import {Mutex} from '../../utils/lib-utils.js';

export class DirectStorageEndpointManager implements StorageService {
  // All the stores, mapped by store ID
  private readonly activeStoresByKey = new Map<StorageKey, ActiveStore<CRDTTypeRecord>>();
  private readonly activeStoreMutex = new Mutex();

  constructor(private readonly driverFactory: DriverFactory,
              private readonly storageKeyParser: StorageKeyParser) {}

  async getActiveStore<T extends Type>(storeInfo: StoreInfo<T>): Promise<ActiveStore<TypeToCRDTTypeRecord<T>>> {
    if (!this.activeStoresByKey.has(storeInfo.storageKey)) {
      const release = await this.activeStoreMutex.acquire();
      try {
        await this.getActiveStoreImpl(storeInfo);
      } finally {
        release();
      }
    }
    return this.activeStoresByKey.get(storeInfo.storageKey) as ActiveStore<TypeToCRDTTypeRecord<T>>;
  }

  private async getActiveStoreImpl<T extends Type>(storeInfo: StoreInfo<T>): Promise<void> {
    if (!this.activeStoresByKey.has(storeInfo.storageKey)) {
      if (ActiveStore.constructors.get(storeInfo.mode) == null) {
        throw new Error(`StorageMode ${storeInfo.mode} not yet implemented`);
      }
      const ctor = ActiveStore.constructors.get(storeInfo.mode);
      if (ctor == null) {
        throw new Error(`No constructor registered for mode ${storeInfo.mode}`);
      }
      this.activeStoresByKey.set(storeInfo.storageKey, await ctor.construct({
        storageKey: storeInfo.storageKey,
        exists: storeInfo.exists,
        type: storeInfo.type as unknown as CRDTTypeRecordToType<TypeToCRDTTypeRecord<T>>,
        storeInfo: storeInfo as unknown as StoreInfo<CRDTTypeRecordToType<TypeToCRDTTypeRecord<T>>>,
        driverFactory: this.driverFactory,
      }));
      storeInfo.exists = Exists.ShouldExist;
    }
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

  getStorageEndpoint<T extends Type>(storeInfo: StoreInfo<T>): StorageCommunicationEndpoint<TypeToCRDTTypeRecord<T>> {
    assert(this.activeStoresByKey.has(storeInfo.storageKey));
    return new DirectStorageEndpoint(
      this.activeStoresByKey.get(storeInfo.storageKey) as ActiveStore<TypeToCRDTTypeRecord<T>>,
      this.storageKeyParser);
  }

  async handleForStoreInfo<T extends Type>(storeInfo: StoreInfo<T>, id: string, idGenerator: IdGenerator, options?: HandleOptions): Promise<ToHandle<TypeToCRDTTypeRecord<T>>> {
    options = options || {};
    await this.getActiveStore(storeInfo);
    const type = options.type || storeInfo.type;
    const particle = options.particle || null;
    const canRead = (options.canRead != undefined) ? options.canRead : true;
    const canWrite = (options.canWrite != undefined) ? options.canWrite : true;
    const name = options.name || null;

    if (storeInfo.type instanceof MuxType) {
      const muxStoreInfo = storeInfo as unknown as StoreInfo<MuxEntityType>;
      const proxyMuxer = new StorageProxyMuxer<CRDTMuxEntity>(this.getStorageEndpoint(muxStoreInfo));
      return new EntityHandleFactory(proxyMuxer) as ToHandle<TypeToCRDTTypeRecord<T>>;
    } else {
      const proxy = new StorageProxy<TypeToCRDTTypeRecord<T>>(
        this.getStorageEndpoint(storeInfo), options.ttl);
      if (type instanceof SingletonType) {
        // tslint:disable-next-line: no-any
        return new SingletonHandle(id, proxy as any, idGenerator, particle, canRead, canWrite, name) as ToHandle<TypeToCRDTTypeRecord<T>>;
      } else {
        // tslint:disable-next-line: no-any
        return new CollectionHandle(id, proxy as any, idGenerator, particle, canRead, canWrite, name) as ToHandle<TypeToCRDTTypeRecord<T>>;
      }
    }
  }
}
