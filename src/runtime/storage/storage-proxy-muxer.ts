/**
 * @license
 * Copyright (c) 2020 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {CRDTTypeRecord} from '../../crdt/lib-crdt.js';
import {StorageCommunicationEndpointProvider, ProxyMessage, ProxyCallback, StorageCommunicationEndpoint} from './store-interface.js';
import {PropagatedException} from '../arc-exceptions.js';
import {ChannelConstructor} from '../channel-constructor.js';
import {StorageProxy} from './storage-proxy.js';
import {Dictionary, BiMap, noAwait} from '../../utils/lib-utils.js';
import {Type} from '../../types/lib-types.js';
import {assert} from '../../platform/assert-web.js';
import {StoreInfo} from './store-info.js';
import {CRDTTypeRecordToType, TypeToCRDTTypeRecord} from './storage.js';

export class StorageProxyMuxer<T extends CRDTTypeRecord> {
  private readonly storageProxies = new BiMap<string, StorageProxy<T>>();
  private readonly callbacks: Dictionary<ProxyCallback<T>> = {};
  private readonly storageEndpoint: StorageCommunicationEndpoint<T>;
  private readonly storageKey: string;
  private readonly type: Type;

  constructor(public readonly storeInfo: StoreInfo<CRDTTypeRecordToType<T>>,
              storeProvider: StorageCommunicationEndpointProvider) {
    this.storageEndpoint = storeProvider.getStorageEndpoint(
      storeInfo,
      this as unknown as StorageProxy<TypeToCRDTTypeRecord<CRDTTypeRecordToType<T>>>
    ) as unknown as StorageCommunicationEndpoint<T>;
    this.storageKey = this.storeInfo.storageKey.toString();
    this.type = this.storeInfo.type;
  }

  getStorageProxy(muxId: string): StorageProxy<T> {
    this.storageEndpoint.setCallback(this.onMessage.bind(this));
    if (!this.storageProxies.hasL(muxId)) {
      const storageCommunicationEndpointProvider = this.createStorageCommunicationEndpointProvider(muxId, this.storageEndpoint, this);
      this.storageProxies.set(muxId, new StorageProxy(muxId, this.storeInfo, storageCommunicationEndpointProvider));
    }
    return this.storageProxies.getL(muxId);
  }

  private createStorageCommunicationEndpointProvider(muxId: string, storageEndpoint: StorageCommunicationEndpoint<T>, storageProxyMuxer: StorageProxyMuxer<T>): StorageCommunicationEndpointProvider {
    return {
      getStorageEndpoint<T extends Type>(storeInfo: StoreInfo<T>): StorageCommunicationEndpoint<TypeToCRDTTypeRecord<T>> {
        return {
          get storeInfo(): StoreInfo<CRDTTypeRecordToType<TypeToCRDTTypeRecord<T>>> {
            return this.storeInfo as unknown as StoreInfo<CRDTTypeRecordToType<TypeToCRDTTypeRecord<T>>>;
          },
          async onProxyMessage(message: ProxyMessage<TypeToCRDTTypeRecord<T>>): Promise<void> {
            message.muxId = muxId;
            await storageEndpoint.onProxyMessage(message);
          },
          setCallback(callback: ProxyCallback<CRDTTypeRecord>): void {
            storageProxyMuxer.callbacks[muxId] = callback;
          },
          reportExceptionInHost(exception: PropagatedException): void {
            storageEndpoint.reportExceptionInHost(exception);
          },
          getChannelConstructor(): ChannelConstructor {
            return storageEndpoint.getChannelConstructor();
          }
        };
      }
    };
  }

  async onMessage(message: ProxyMessage<T>): Promise<void> {
    assert(message.muxId != null);
    if (!this.callbacks[message.muxId]) {
      throw new Error('callback has not been set');
    }
    noAwait(this.callbacks[message.muxId](message));
  }
}
