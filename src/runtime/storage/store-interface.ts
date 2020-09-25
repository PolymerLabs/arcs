/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {assert} from '../../platform/assert-web.js';
import {PropagatedException} from '../arc-exceptions.js';
import {CRDTTypeRecord, CRDTModel} from '../../crdt/lib-crdt.js';
import {Exists} from './drivers/driver.js';
import {StorageKey} from './storage-key.js';
import {StorageProxy} from './storage-proxy.js';
import {Producer, Dictionary, noAwait} from '../../utils/lib-utils.js';
import {ChannelConstructor} from '../channel-constructor.js';
import {StorageProxyMuxer} from './storage-proxy-muxer.js';
import {Store} from './store.js';
import {CRDTTypeRecordToType, CRDTMuxEntity} from './storage.js';
import {StoreRecord} from './direct-store-muxer.js';
import {StoreInfo} from './store-info.js';

/**
 * This file exists to break a circular dependency between Store and the ActiveStore implementations.
 * Source code outside of the storage directory should not import this file directly; instead use
 * store.ts, which re-exports all the useful symbols.
 */

export enum StorageMode {Direct, Backing, ReferenceMode}

export enum ProxyMessageType {SyncRequest, ModelUpdate, Operations}

export type ProxyMessage<T extends CRDTTypeRecord> =
  {type: ProxyMessageType.SyncRequest, id?: number, muxId?: string} |
  {type: ProxyMessageType.ModelUpdate, model: T['data'], id?: number, muxId?: string} |
  {type: ProxyMessageType.Operations, operations: T['operation'][], id?: number, muxId?: string};

export type ProxyCallback<T extends CRDTTypeRecord> = (message: ProxyMessage<T>) => Promise<void>;

export type StoreInterface<T extends CRDTTypeRecord> = {
  readonly storageKey: StorageKey;
  exists: Exists;
  readonly type: CRDTTypeRecordToType<T>;
  readonly mode: StorageMode;
};

export type StoreConstructorOptions<T extends CRDTTypeRecord> = {
  storageKey: StorageKey,
  exists: Exists,
  type: CRDTTypeRecordToType<T>,
  storeInfo?: StoreInfo<CRDTTypeRecordToType<T>>;
};

export type StoreConstructor = {
  construct<T extends CRDTTypeRecord>(options: StoreConstructorOptions<T>): Promise<ActiveStore<T>>;
};

// Interface common to an ActiveStore and the PEC, used by the StorageProxy.
export interface StorageCommunicationEndpoint<T extends CRDTTypeRecord> {
  setCallback(callback: ProxyCallback<T>): void;
  reportExceptionInHost(exception: PropagatedException): void;
  onProxyMessage(message: ProxyMessage<T>): Promise<void>;
  getChannelConstructor: Producer<ChannelConstructor>;
}

export interface StorageCommunicationEndpointProvider<T extends CRDTTypeRecord> {
  getStorageEndpoint(storageProxy: StorageProxy<T> | StorageProxyMuxer<T>): StorageCommunicationEndpoint<T>;
}

// A representation of an active store. Subclasses of this class provide specific
// behaviour as controlled by the provided StorageMode.
export abstract class ActiveStore<T extends CRDTTypeRecord>
    implements StoreInterface<T>, StorageCommunicationEndpointProvider<T> {
  readonly storageKey: StorageKey;
  exists: Exists;
  readonly type: CRDTTypeRecordToType<T>;
  readonly storeInfo: StoreInfo<CRDTTypeRecordToType<T>>;

  constructor(options: StoreConstructorOptions<T>) {
    this.storageKey = options.storageKey;
    this.type = options.type;
    this.storeInfo = options.storeInfo;
  }

  get mode(): StorageMode { return this.storeInfo.mode; }

  async idle() {
    return Promise.resolve();
  }

  abstract async serializeContents(): Promise<T['data']>;

  async cloneFrom(store: ActiveStore<T>): Promise<void> {
    // TODO(shans): work out what ID to use for messages that aren't from an established
    // channel, like these.
    assert(store instanceof ActiveStore);
    const activeStore: ActiveStore<T> = store as ActiveStore<T>;
    assert(this.mode === activeStore.mode);
    await this.onProxyMessage({
      type: ProxyMessageType.ModelUpdate,
      model: await activeStore.serializeContents(),
      id: 0
    });
  }

  async modelForSynchronization(): Promise<{}> {
    return this.serializeContents();
  }

  abstract on(callback: ProxyCallback<T>): number;
  abstract off(callback: number): void;
  abstract async onProxyMessage(message: ProxyMessage<T>): Promise<void>;
  abstract reportExceptionInHost(exception: PropagatedException): void;

  getStorageEndpoint() {
    const store = this;
    let id: number;
    return {
      async onProxyMessage(message: ProxyMessage<T>): Promise<void> {
        message.id = id!;
        noAwait(store.onProxyMessage(message));
      },

      setCallback(callback: ProxyCallback<T>) {
        id = store.on(callback);
      },
      reportExceptionInHost(exception: PropagatedException): void {
        store.reportExceptionInHost(exception);
      },
      getChannelConstructor(): ChannelConstructor {
        // TODO(shans): implement so that we can use references outside of the PEC.
        return {
          generateID() {
            throw new Error('References not yet supported outside of the PEC');
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
    };
  }
}
