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
import {Handle} from './handle.js';
import {Type} from '../type.js';
import {assert} from '../../platform/assert-web.js';
import {BiMap} from '../bimap.js';

export class BackingStorageProxy<T extends CRDTTypeRecord> implements StorageCommunicationEndpointProvider<CRDTTypeRecord> {
  private storageProxies: BiMap<string, StorageProxy<CRDTTypeRecord>> = new BiMap<string, StorageProxy<CRDTTypeRecord>>();
  private callbacks: Dictionary<ProxyCallback<CRDTTypeRecord>> = {};
  private storageEndpoint: StorageCommunicationEndpoint<T>;
  private storageKey: string;
  private type: Type;

  constructor(storeProvider: StorageCommunicationEndpointProvider<T>, type: Type, storageKey: string) {
    this.storageEndpoint = storeProvider.getStorageEndpoint(this);
    this.storageEndpoint.setCallback(this.onMessage.bind(this));
    this.storageKey = storageKey;
    this.type = type;
  }

  getStorageEndpoint(storageProxy: StorageProxy<CRDTTypeRecord>): StorageCommunicationEndpoint<CRDTTypeRecord> {
    const backingStorageProxy = this;
    const storageEndpoint = this.storageEndpoint;
    if (!this.storageProxies.hasR(storageProxy)) {
      throw new Error('storage proxy is not registered with backing storage proxy');
    }
    const muxId = this.storageProxies.getR(storageProxy);
    return {
      async onProxyMessage(message: ProxyMessage<CRDTTypeRecord>): Promise<boolean> {
        message.muxId = muxId;
        return storageEndpoint.onProxyMessage(message);
      },
      setCallback(callback: ProxyCallback<CRDTTypeRecord>): void {
        backingStorageProxy.callbacks[muxId] = callback;
      },
      reportExceptionInHost(exception: PropagatedException): void {
        storageEndpoint.reportExceptionInHost(exception);
      },
      getChannelConstructor(): ChannelConstructor {
        return storageEndpoint.getChannelConstructor();
      }
    };
  }

  registerHandle(handle: Handle<T>, muxId: string): void {
    if (!this.storageProxies.hasL(muxId)) {
      this.storageProxies.set(muxId, new StorageProxy(muxId, this, this.type, this.storageKey));
    }
    this.storageProxies.getL(muxId).registerHandle(handle);
  }

  async onMessage(message: ProxyMessage<T>): Promise<boolean> {
    assert(message.muxId != null);
    if (!this.callbacks[message.muxId]) {
      throw new Error('callback has not been set');
    }
    return this.callbacks[message.muxId](message);
  }
}
