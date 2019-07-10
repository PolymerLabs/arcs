import {CRDTTypeRecord, CRDTModel} from "../crdt/crdt";
import {ActiveStore, StorageMode, ProxyMessage, ProxyCallback} from "./store";
import {StorageKey} from "./storage-key";
import {Exists} from "./drivers/driver-factory";
import {Type} from "../type";
import {DirectStore} from "./direct-store";
import {Dictionary} from "../hot";

/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

export type MultiplexedProxyCallback<T extends CRDTTypeRecord> = (message: ProxyMessage<T> & {mux_id: string}) => Promise<boolean>;

export class BackingStore<T extends CRDTTypeRecord>  {
  
  private stores: Dictionary<{store: DirectStore<T>, id: number}> = {};
  private callbacks = new Map<number, MultiplexedProxyCallback<T>>();
  private nextCallbackId = 1;

  private constructor(private storageKey: StorageKey, private exists: Exists, private type: Type, private mode: StorageMode, private modelConstructor: new () => CRDTModel<T>) {
  }

  on(callback: MultiplexedProxyCallback<T>): number {
    this.callbacks.set(this.nextCallbackId, callback);
    return this.nextCallbackId++;
  }
  
  off(callback: number): void {
    this.callbacks.delete(callback);
  }
  
  async processStoreCallback(muxId: string, message: ProxyMessage<T>): Promise<boolean> {
    return Promise.all([...this.callbacks.values()].map(callback => callback({mux_id: muxId, ...message}))).then(a => a.reduce((a, b) => a && b));
  }

  async onProxyMessage(message: ProxyMessage<T> & {mux_id: string}): Promise<boolean> {
    if (this.stores[message.mux_id] == null) {
      const store = await DirectStore.construct(this.storageKey.childWithComponent(message.mux_id), this.exists, this.type, this.mode, this.modelConstructor);
      const id = store.on(msg => this.processStoreCallback(message.mux_id, msg));
      this.stores[message.mux_id] = {store, id};
    }
    const {store, id} = this.stores[message.mux_id];
    delete message.mux_id;
    message.id = id;
    return store.onProxyMessage(message);
  }

  static async construct<T extends CRDTTypeRecord>(storageKey: StorageKey, exists: Exists, type: Type, mode: StorageMode, modelConstructor: new () => CRDTModel<T>) {
    return new BackingStore<T>(storageKey, exists, type, mode, modelConstructor);
  }

  async idle() {
    await Promise.all(Object.values(this.stores).map(({store}) => store.idle()));
  }
}
