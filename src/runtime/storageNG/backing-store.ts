/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {CRDTTypeRecord} from '../crdt/crdt.js';
import {ProxyMessage, ProxyCallback} from './store.js';
import {StorageKey} from './storage-key.js';
import {DirectStore} from './direct-store.js';
import {Dictionary} from '../hot.js';
import {StoreConstructorOptions} from './store-interface.js';
import {assert} from '../../platform/assert-web.js';

type StoreRecord<T extends CRDTTypeRecord> = {type: 'record', store: DirectStore<T>, id: number} | {type: 'pending', promise: Promise<{type: 'record', store: DirectStore<T>, id: number}>};
/**
 * A store that allows multiple CRDT models to be stored as sub-keys of a single storageKey location.
 */
export class BackingStore<T extends CRDTTypeRecord>  {

  storageKey: StorageKey;

  private readonly stores: Dictionary<StoreRecord<T>> = {};
  private readonly callbacks = new Map<number, ProxyCallback<T>>();
  private nextCallbackId = 1;
  private readonly options: StoreConstructorOptions<T>;

  private constructor(options: StoreConstructorOptions<T>) {
    this.storageKey = options.storageKey;
    this.options = options;
  }

  on(callback: ProxyCallback<T>): number {
    this.callbacks.set(this.nextCallbackId, callback);
    return this.nextCallbackId++;
  }

  off(callback: number): void {
    this.callbacks.delete(callback);
  }

  getLocalModel(muxId: string) {
    const store = this.stores[muxId];

    if (store == null) {
      this.stores[muxId] = {type: 'pending', promise: this.setupStore(muxId)};
      return null;
    }
    if (store.type === 'pending') {
      return null;
    } else {
      return store.store.localModel;
    }
  }

  private async setupStore(muxId: string): Promise<{type: 'record', store: DirectStore<T>, id: number}> {
    const store = await DirectStore.construct<T>({...this.options, storageKey: this.storageKey.childKeyForBackingElement(muxId)});
    const record: StoreRecord<T> = {store, id: 0, type: 'record'};
    this.stores[muxId] = record;
    // Calling store.on may trigger an event; this will be delivered (via processStoreCallback) upstream and may in
    // turn trigger a request for the localModel. It's important that there's a recorded store in place for the local
    // model to be retrieved from, even though we don't have the correct id until store.on returns.
    record.id = store.on(msg => this.processStoreCallback(muxId, msg));
    return record;
  }

  async onProxyMessage(message: ProxyMessage<T>): Promise<boolean> {
    assert(message.muxId != null);
    let storeRecord = this.stores[message.muxId];
    if (storeRecord == null) {
      storeRecord = await this.setupStore(message.muxId);
    }
    if (storeRecord.type === 'pending') {
      storeRecord = await storeRecord.promise;
    }
    const {store, id} = storeRecord;
    message.id = id;
    return store.onProxyMessage(message);
  }

  static async construct<T extends CRDTTypeRecord>(options: StoreConstructorOptions<T>) {
    return new BackingStore<T>(options);
  }

  async idle() {
    const stores: DirectStore<T>[] = [];
    for (const store of Object.values(this.stores)) {
      if (store.type === 'record') {
        stores.push(store.store);
      }
    }
    await Promise.all(stores.map(store => store.idle()));
  }

  async processStoreCallback(muxId: string, message: ProxyMessage<T>): Promise<void> {
    message.muxId = muxId;
    Promise.all([...this.callbacks.values()].map(callback => callback(message)));
  }
}
