/**
 * @license
 * Copyright (c) 2020 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {CRDTTypeRecord} from '../crdt/crdt.js';
import {StorageCommunicationEndpointProvider, ProxyMessage, ProxyCallback, StorageCommunicationEndpoint} from './store.js';
import {PropagatedException} from '../arc-exceptions.js';
import {ChannelConstructor} from '../channel-constructor.js';
import {StorageProxy} from './storage-proxy.js';
import {Dictionary} from '../hot.js';
import {Type} from '../type.js';
import {assert} from '../../platform/assert-web.js';
import {BiMap} from '../bimap.js';
import {noAwait} from '../util.js';

export class StorageProxyMuxer<T extends CRDTTypeRecord> {
  private readonly storageProxies = new BiMap<string, StorageProxy<T>>();
  private readonly callbacks: Dictionary<ProxyCallback<T>> = {};
  private readonly storageEndpoint: StorageCommunicationEndpoint<T>;
  private readonly storageKey: string;
  private readonly type: Type;

  constructor(storeProvider: StorageCommunicationEndpointProvider<T>, type: Type, storageKey: string) {
    this.storageEndpoint = storeProvider.getStorageEndpoint(this);
    this.storageKey = storageKey;
    this.type = type;
  }

  getStorageProxy(muxId: string): StorageProxy<T> {
    this.storageEndpoint.setCallback(this.onMessage.bind(this));
    if (!this.storageProxies.hasL(muxId)) {
      const storageCommunicationEndpointProvider = this.createStorageCommunicationEndpointProvider(muxId, this.storageEndpoint, this);
      this.storageProxies.set(muxId, new StorageProxy(muxId, storageCommunicationEndpointProvider, this.type.getContainedType(), this.storageKey));
    }
    return this.storageProxies.getL(muxId);
  }

  createStorageCommunicationEndpointProvider(muxId: string, storageEndpoint: StorageCommunicationEndpoint<T>, storageProxyMuxer: StorageProxyMuxer<T>): StorageCommunicationEndpointProvider<T> {
    return {
      getStorageEndpoint(): StorageCommunicationEndpoint<T> {
        return {
          async onProxyMessage(message: ProxyMessage<CRDTTypeRecord>): Promise<void> {
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
