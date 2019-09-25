/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {CRDTTypeRecord, CRDTModel} from '../crdt/crdt.js';
import {ActiveStore, StorageMode, ProxyMessage, ProxyCallback} from './store.js';
import {StorageKey} from './storage-key.js';
import {Exists} from './drivers/driver-factory.js';
import {Type} from '../type.js';
import {DirectStore} from './direct-store.js';
import {Dictionary} from '../hot.js';

export type MultiplexedProxyCallback<T extends CRDTTypeRecord> = (message: ProxyMessage<T>, muxId: string) => Promise<boolean>;


type StoreRecord<T extends CRDTTypeRecord> = {type: 'record', store: DirectStore<T>, id: number} | {type: 'pending', promise: Promise<{type: 'record', store: DirectStore<T>, id: number}>};
/**
 * A store that allows multiple CRDT models to be stored as sub-keys of a single storageKey location.
 */
export class BackingStore<T extends CRDTTypeRecord>  {
  
  private stores: Dictionary<StoreRecord<T>> = {};
  private callbacks = new Map<number, MultiplexedProxyCallback<T>>();
  private nextCallbackId = 1;

  private constructor(
    public storageKey: StorageKey,
    private exists: Exists,
    private type: Type,
    private mode: StorageMode) {
  }

  on(callback: MultiplexedProxyCallback<T>): number {
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
    const store = await DirectStore.construct<T>(this.storageKey.childWithComponent(muxId), this.exists, this.type, this.mode);
    const id = store.on(msg => this.processStoreCallback(muxId, msg));
    const record: StoreRecord<T> = {store, id, type: 'record'};
    this.stores[muxId] = record;
    return record;
  }

  async onProxyMessage(message: ProxyMessage<T>, muxId: string): Promise<boolean> {
    let storeRecord = this.stores[muxId];
    if (storeRecord == null) {
      storeRecord = await this.setupStore(muxId);
    }
    if (storeRecord.type === 'pending') {
      storeRecord = await storeRecord.promise;
    }
    const {store, id} = storeRecord;
    message.id = id;
    return store.onProxyMessage(message);
  }

  static async construct<T extends CRDTTypeRecord>(storageKey: StorageKey, exists: Exists, type: Type, mode: StorageMode) {
    return new BackingStore<T>(storageKey, exists, type, mode);
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

  async processStoreCallback(muxId: string, message: ProxyMessage<T>): Promise<boolean> {
    return Promise.all([...this.callbacks.values()].map(callback => callback(message, muxId))).then(a => a.reduce((a, b) => a && b));
  }
}
