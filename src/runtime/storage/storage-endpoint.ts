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

export function createStorageEndpoint(
    storageProxy: StorageProxy<CRDTTypeRecord> | StorageProxyMuxer<CRDTTypeRecord>,
    channelConstructor: ChannelConstructor,
    storageFrontend: StorageFrontend): StorageCommunicationEndpoint<CRDTTypeRecord> {
  if (storageProxy instanceof StorageProxy) {
    return new StorageEndpointImpl(storageProxy, channelConstructor, storageFrontend);
  } else if (storageProxy instanceof StorageProxyMuxer) {
    return new StorageMuxerEndpointImpl(storageProxy, channelConstructor, storageFrontend);
  } else {
    throw new Error('Invalid Proxy');
  }
}

export class StorageEndpointImpl<T extends CRDTTypeRecord> implements StorageCommunicationEndpoint<T> {
  idPromise: Promise<number> = null;

  constructor(public readonly storageProxy: StorageProxy<CRDTTypeRecord>,
              public readonly channelConstructor: ChannelConstructor,
              public readonly storageFrontend: StorageFrontend) {}

  async onProxyMessage(message: ProxyMessage<CRDTTypeRecord>): Promise<void> {
    if (this.idPromise == null) {
      throw new Error('onProxyMessage called without first calling setCallback!');
    }
    message.id = await this.idPromise;
    if (message.id == null) {
      throw new Error('undefined id received .. somehow');
    }

    this.storageFrontend.ProxyMessage(this.storageProxy, message);
  }

  reportExceptionInHost(exception: PropagatedException): void {
    this.storageFrontend.ReportExceptionInHost(exception);
  }

  setCallback(callback: ProxyCallback<CRDTTypeRecord>): void {
    this.idPromise = new Promise<number>(resolve => {
      this.storageFrontend.Register(this.storageProxy, callback, resolve);
    });
  }

  getChannelConstructor(): ChannelConstructor { return this.channelConstructor; }
}

export class StorageMuxerEndpointImpl<T extends CRDTTypeRecord> implements StorageCommunicationEndpoint<T> {
  idPromise: Promise<number> = null;

  constructor(public readonly storageProxy: StorageProxyMuxer<CRDTTypeRecord>,
    public readonly channelConstructor: ChannelConstructor,
    public readonly storageFrontend: StorageFrontend) {}

  async onProxyMessage(message: ProxyMessage<CRDTTypeRecord>): Promise<void> {
    if (this.idPromise == null) {
      throw new Error('onProxyMessage called without first calling setCallback!');
    }
    message.id = await this.idPromise;
    if (message.id == null) {
      throw new Error('undefined id received .. somehow');
    }

    // Proxy messages sent to Direct Store Muxers require a muxId in order to redirect the message to the correct store.
    assert(message.muxId != null);
    this.storageFrontend.StorageProxyMuxerMessage(this.storageProxy, message);
  }

  setCallback(callback: ProxyCallback<CRDTTypeRecord>): void {
    this.idPromise = new Promise<number>(resolve => {
      this.storageFrontend.DirectStoreMuxerRegister(this.storageProxy, callback, resolve);
    });
  }

  reportExceptionInHost(exception: PropagatedException): void {
    this.storageFrontend.ReportExceptionInHost(exception);
  }

  getChannelConstructor(): ChannelConstructor {
    return this.channelConstructor;
  }
}
