
/**
 * @license
 * Copyright (c) 2020 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {StorageCommunicationEndpoint, ProxyMessage, ProxyCallback, StorageCommunicationEndpointProvider} from './store-interface.js';
import {CRDTTypeRecord} from '../../crdt/lib-crdt.js';
import {ActiveStore} from './active-store.js';
import {ChannelConstructor} from '../channel-constructor.js';
import {PropagatedException} from '../arc-exceptions.js';
import {noAwait} from '../../utils/lib-utils.js';

export class DirectStorageEndpoint<T extends CRDTTypeRecord> implements StorageCommunicationEndpoint<T> {
  private id: number = 0;

  constructor(private readonly store: ActiveStore<T>) {}

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

  getChannelConstructor(): ChannelConstructor {
    const store = this.store;
    // TODO(shans): implement so that we can use references outside of the PEC.
    return {
      generateID() {
        return null;
      },
      idGenerator: null,
      getStorageProxyMuxer() {
        throw new Error('References not yet supported outside of the PEC');
      },
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
