
/**
 * @license
 * Copyright (c) 2020 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {StorageCommunicationEndpoint, ProxyMessage, ProxyCallback} from './store-interface.js';
import {CRDTTypeRecord} from '../../crdt/lib-crdt.js';
import {ActiveStore} from './active-store.js';
import {StorageFrontend} from './storage-frontend.js';
import {PropagatedException} from '../arc-exceptions.js';
import {noAwait, Consumer} from '../../utils/lib-utils.js';
import {StorageProxy} from './storage-proxy.js';
import {StorageProxyMuxer} from './storage-proxy-muxer.js';
import {StorageKeyParser} from './storage-key-parser.js';

export class DirectStorageEndpoint<T extends CRDTTypeRecord> implements StorageCommunicationEndpoint<T> {
  private id = 0;

  constructor(private readonly store: ActiveStore<T>,
              private readonly storageKeyParser?: StorageKeyParser) {}

  get storeInfo() { return this.store.storeInfo; }

  async onProxyMessage(message: ProxyMessage<T>): Promise<void> {
    message.id = this.id!;
    noAwait(this.store.onProxyMessage(message));
  }

  setCallback(callback: ProxyCallback<T>) {
    this.id = this.store.on(callback);
  }
  reportExceptionInHost(exception: PropagatedException): void {
    this.store.reportExceptionInHost(exception);
  }

  getStorageFrontend(): StorageFrontend {
    const store = this.store;
    const storageKeyParser = this.storageKeyParser;
    // TODO(shans): implement so that we can use references outside of the PEC.
    return {
      generateID() {
        return null;
      },
      idGenerator: null,
      storageKeyParser,
      getStorageProxyMuxer() {
        throw new Error('References not yet supported outside of the PEC');
      },
      registerStorageProxy(storageProxy: StorageProxy<CRDTTypeRecord>,
        messagesCallback: ProxyCallback<CRDTTypeRecord>,
        idCallback: Consumer<number>): void {},
      directStorageProxyMuxerRegister(storageProxyMuxer: StorageProxyMuxer<CRDTTypeRecord>,
                   messagesCallback: ProxyCallback<CRDTTypeRecord>,
                   idCallback: Consumer<number>): void {},
      storageProxyMessage(storageProxy: StorageProxy<CRDTTypeRecord>,
            message: ProxyMessage<CRDTTypeRecord>): void {},
      storageProxyMuxerMessage(storageProxyMuxer: StorageProxyMuxer<CRDTTypeRecord>,
            message: ProxyMessage<CRDTTypeRecord>): void {},
      reportExceptionInHost(exception: PropagatedException): void {
        store.reportExceptionInHost(exception);
      }
    };
  }
  async idle(): Promise<void> { return this.store.idle(); }
  async close(): Promise<void> {
    if (this.id) {
      return this.store.off(this.id);
    }
  }
}
