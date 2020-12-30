/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {CRDTTypeRecord, CRDTModel, Identified, CRDTEntityTypeRecord} from '../../crdt/lib-crdt.js';
import {ProxyMessage, ProxyCallback} from './store-interface.js';
import {ActiveStore} from './active-store.js';
import {StorageKey} from './storage-key.js';
import {DirectStore} from './direct-store.js';
import {Dictionary, BiMap, noAwait} from '../../utils/lib-utils.js';
import {StoreConstructorOptions, StorageMode, ProxyMessageType} from './store-interface.js';
import {assert} from '../../platform/assert-web.js';
import {PropagatedException, reportSystemException} from '../arc-exceptions.js';
import {ChannelConstructor} from '../channel-constructor.js';

/**
 * Registering a callback results in a callback ID. Storage Proxy Muxers/Reference Mode Stores register a
 * callback with the DSM, and the DSM registers callbacks with the Direct Stores it contains.
 *
 * Each callback a DSM registers with a Direct Store is associated with a callback that has been registered with the DSM.
 * This gives the illusion of a single communication channel between a Storage Proxy Muxer or Reference Mode Store and a
 * Direct Store.
 *
 * CallbackIdMapping is a bidirectional mapping of ID numbers of callbacks registered with the DSM to ID numbers of
 * callbacks the DSM registers with a designated Direct Store. There is one CallbackIdMapping per Direct Store
 */
type CallbackIdMapping = BiMap<number, number|Promise<number>>;

/**
 * A StoreRecord of type 'record' includes the DirectStore and the CallbackIdMapping for that Direct Store.
 * A StoreRecord of type 'pending' includes a promise for a StoreRecord of type 'record'.
 */
export type StoreRecord<T extends CRDTTypeRecord> = {type: 'record', store: DirectStore<T>, idMap: CallbackIdMapping} | {type: 'pending', promise: Promise<{type: 'record', store: DirectStore<T>, idMap: CallbackIdMapping}>};

/**
 * A store that allows multiple CRDT models to be stored as sub-keys of a single storageKey location.
 */
export class DirectStoreMuxer<S extends Identified, C extends Identified, T extends CRDTEntityTypeRecord<S, C>> extends ActiveStore<T> {
  versionToken: string;
  storageKey: StorageKey;

  readonly stores: Dictionary<StoreRecord<T>> = {};
  private readonly callbacks = new Map<number, ProxyCallback<T>>();
  private callbackIdToMuxIdMap = new Map<number, Set<string>>();
  private nextCallbackId = 1;
  private readonly options: StoreConstructorOptions<T>;

  constructor(options: StoreConstructorOptions<T>) {
    super(options);
    this.storageKey = options.storageKey;
    this.options = options;
  }

  on(callback: ProxyCallback<T>): number {
    this.callbacks.set(this.nextCallbackId, callback);
    this.callbackIdToMuxIdMap.set(this.nextCallbackId, new Set());
    return this.nextCallbackId++;
  }

  off(callback: number): void {
    this.callbacks.delete(callback);
    for (const muxId of this.callbackIdToMuxIdMap[callback]) {
      const storeRecord = this.stores[muxId];
      if (storeRecord.type === 'record') {
        storeRecord.store.off(storeRecord.idMap.getR(callback));
        storeRecord.idMap.deleteL(callback);
      }
    }
  }

  getLocalModel(muxId: string, id: number): CRDTModel<T> {
    const store = this.stores[muxId];

    if (store == null) {
      this.stores[muxId] = {type: 'pending', promise: this.setupStore(muxId, id)};
      return null;
    }
    if (store.type === 'pending') {
      return null;
    } else {
      if (!store.idMap.hasL(id)) {
        store.idMap.set(id, this.createListenerForStore(store.store, muxId, id));
        this.callbackIdToMuxIdMap.get(id).add(muxId);
      }
      return store.store.localModel;
    }
  }

  private async setupStore(muxId: string, callbackId: number): Promise<{type: 'record', store: DirectStore<T>, idMap: BiMap<number, number|Promise<number>>}> {
    const store = await DirectStore.construct<T>({...this.options, storageKey: this.storageKey.childKeyForBackingElement(muxId)});
    const record: StoreRecord<T> = {store, idMap: new BiMap<number, number>(), type: 'record'};

    // Creating a listener for the store may trigger an event; this will be delivered upstream and may in turn trigger
    // a request for the localModel. It's important that there's a recorded store in place for the local model to be
    // retrieved from, even though we don't have the correct id until store.on returns.
    this.stores[muxId] = record;

    const storeCallbackId = await this.createListenerForStore(store, muxId, callbackId);
    record.idMap.set(callbackId, storeCallbackId);
    this.callbackIdToMuxIdMap.get(callbackId).add(muxId);

    return record;
  }

  private async createListenerForStore(store: DirectStore<T>, muxId: string, id: number): Promise<number> {
    const dsm = this;

    const callbackForStore = async (msg: ProxyMessage<T>): Promise<void> => {
      msg.muxId = muxId;
      const callback = dsm.callbacks.get(id);
      noAwait(callback({...msg, id}));
    };

    const storeCallbackId = await store.on(callbackForStore);
    return storeCallbackId;
  }

  async onProxyMessage(message: ProxyMessage<T>): Promise<void> {
    assert(message.muxId != null);

    let storeRecord = this.stores[message.muxId];
    if (storeRecord == null) {
      storeRecord = {type: 'pending', promise: this.setupStore(message.muxId, message.id)};
      this.stores[message.muxId] = storeRecord;
    }
    if (storeRecord.type === 'pending') {
      storeRecord = await storeRecord.promise;
    }
    // check if there's a channel for message.id
    if (!storeRecord.idMap.hasL(message.id)) {
      const storeCallbackId = await this.createListenerForStore(storeRecord.store, message.muxId, message.id);
      storeRecord.idMap.set(message.id, storeCallbackId);
      this.callbackIdToMuxIdMap.get(message.id).add(message.muxId);
    }

    const {store, idMap} = storeRecord;
    await store.onProxyMessage({...message, id: await idMap.getL(message.id)});
  }

  static async construct<S extends Identified, C extends Identified, T extends CRDTEntityTypeRecord<S, C>>(options: StoreConstructorOptions<T>) {
    return new DirectStoreMuxer<S, C, T>(options);
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

  reportExceptionInHost(exception: PropagatedException): void {
    reportSystemException(null, exception);
  }

  async cloneFrom(store: ActiveStore<T>): Promise<void> {
    assert(store instanceof DirectStoreMuxer);
    const dsm = store as DirectStoreMuxer<S, C, T>;
    for (const muxId of Object.keys(dsm.stores)) {
      await this.onProxyMessage({
        type: ProxyMessageType.ModelUpdate,
        model: dsm.getLocalModel(muxId, 0).getData(),
        id: 0
      });
    }
  }

  async serializeContents(): Promise<T['data']> {
    throw new Error('DirectStoreMuxer contents can not be serialized.');
  }
}
