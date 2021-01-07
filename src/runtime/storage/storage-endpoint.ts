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

import {StorageProxy} from './storage-proxy.js';
import {CRDTTypeRecord} from '../../crdt/lib-crdt.js';
import {ProxyCallback} from './store-interface.js';
import {StorageProxyMuxer} from './storage-proxy-muxer.js';
import {ProxyMessage, StorageCommunicationEndpoint} from './store-interface.js';
import {PropagatedException} from '../arc-exceptions.js';
import {ChannelConstructor} from '../channel-constructor.js';
import {StorageFrontend} from './storage-frontend.js';
import {StoreInfo} from './store-info.js';
import {CRDTTypeRecordToType} from './storage.js';
import {Type} from '../../types/lib-types.js';

export class StorageEndpointImpl<T extends CRDTTypeRecord> implements StorageCommunicationEndpoint<T> {
  idPromise: Promise<number> = null;
  constructor(public readonly storeInfo: StoreInfo<CRDTTypeRecordToType<T>>) {}

  private storageProxy: StorageProxy<T> | StorageProxyMuxer<T>;
  private channelConstructor: ChannelConstructor;
  private storageFrontend: StorageFrontend;

  init(storageProxy: StorageProxy<T> | StorageProxyMuxer<T>,
       channelConstructor: ChannelConstructor,
       storageFrontend: StorageFrontend) {
    assert(!this.storageProxy, `Storage proxy already initialized`);
    assert(!this.channelConstructor, `Channel constructor already initialized`);
    assert(!this.storageFrontend, `Storage frontend already initialized`);
    this.storageProxy = storageProxy;
    this.channelConstructor = channelConstructor;
    this.storageFrontend = storageFrontend;
  }

  async onProxyMessage(message: ProxyMessage<CRDTTypeRecord>): Promise<void> {
    assert(this.storageProxy, `Storage proxy must be initialized`);
    if (this.idPromise == null) {
      throw new Error('onProxyMessage called without first calling setCallback!');
    }
    message.id = await this.idPromise;
    if (message.id == null) {
      throw new Error('undefined id received .. somehow');
    }

    if (this.storageProxy instanceof StorageProxy) {
      this.storageFrontend.ProxyMessage(this.storageProxy, message);
    } else {
      // Proxy messages sent to Direct Store Muxers require a muxId in order to redirect the message to the correct store.
      assert(message.muxId != null);
      this.storageFrontend.StorageProxyMuxerMessage(this.storageProxy as unknown as StorageProxyMuxer<CRDTTypeRecord>, message);
    }
  }

  reportExceptionInHost(exception: PropagatedException): void {
    assert(this.storageFrontend, `Storage frontend must be initialized`);
    this.storageFrontend.ReportExceptionInHost(exception);
  }

  setCallback(callback: ProxyCallback<CRDTTypeRecord>): void {
    assert(this.storageProxy, `Storage proxy must be initialized`);
    this.idPromise = new Promise<number>(resolve => {
      if (this.storageProxy instanceof StorageProxy) {
        this.storageFrontend.Register(this.storageProxy, callback, resolve);
      } else {
        this.storageFrontend.DirectStoreMuxerRegister(this.storageProxy as unknown as StorageProxyMuxer<CRDTTypeRecord>, callback, resolve);
      }
    });
  }

  getChannelConstructor(): ChannelConstructor {
    assert(this.channelConstructor, `Channel constructor must be initialized`);
    return this.channelConstructor;
  }
}
