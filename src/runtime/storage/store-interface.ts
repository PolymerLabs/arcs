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
import {CRDTTypeRecord, CRDTModel} from '../crdt/crdt.js';
import {Exists} from './drivers/driver.js';
import {StorageKey} from './storage-key.js';
import {StorageProxy} from './storage-proxy.js';
import {Producer, Dictionary} from '../hot.js';
import {ChannelConstructor} from '../channel-constructor.js';
import {StorageProxyMuxer} from './storage-proxy-muxer.js';
import {noAwait} from '../util.js';
import {AbstractStore} from './abstract-store.js';
import {CRDTTypeRecordToType, CRDTMuxEntity} from './storage.js';
import {StoreRecord} from './direct-store-muxer.js';

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
  mode: StorageMode,
  baseStore: AbstractStore,
  versionToken: string
};

export type StoreConstructor = {
  construct<T extends CRDTTypeRecord>(options: StoreConstructorOptions<T>): Promise<AbstractActiveStore<T>>;
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

export interface AbstractActiveStore<T extends CRDTTypeRecord> {
  versionToken: string;
  baseStore: AbstractStore;
  on(callback: ProxyCallback<T>): number;
  off(callback: number): void;
  onProxyMessage(message: ProxyMessage<T>): Promise<void>;
  reportExceptionInHost(exception: PropagatedException): void;
  cloneFrom(store: AbstractActiveStore<T>): Promise<void>;
}

export function isActiveStore(abstractActiveStore: AbstractActiveStore<CRDTTypeRecord>): abstractActiveStore is ActiveStore<CRDTTypeRecord> {
  return (!abstractActiveStore.baseStore.type.isMux);
}

export function isActiveMuxer(abstractActiveStore: AbstractActiveStore<CRDTTypeRecord>): abstractActiveStore is ActiveMuxer<CRDTMuxEntity> {
  return (abstractActiveStore.baseStore.type.isMux);
}

// A representation of an active store. Subclasses of this class provide specific
// behaviour as controlled by the provided StorageMode.
export abstract class ActiveStore<T extends CRDTTypeRecord>
    implements StoreInterface<T>, StorageCommunicationEndpointProvider<T>, AbstractActiveStore<T> {
  readonly storageKey: StorageKey;
  exists: Exists;
  readonly type: CRDTTypeRecordToType<T>;
  readonly mode: StorageMode;
  readonly baseStore: AbstractStore;
  readonly versionToken: string;

  // TODO: Lots of these params can be pulled from baseStore.
  constructor(options: StoreConstructorOptions<T>) {
    this.storageKey = options.storageKey;
    this.exists = options.exists;
    this.type = options.type;
    this.mode = options.mode;
    this.baseStore = options.baseStore;
  }

  async idle() {
    return Promise.resolve();
  }

  // tslint:disable-next-line no-any
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
export abstract class ActiveMuxer<T extends CRDTTypeRecord> implements StorageCommunicationEndpointProvider<T>, AbstractActiveStore<T> {
  abstract versionToken: string;
  readonly baseStore: AbstractStore;
  abstract readonly stores: Dictionary<StoreRecord<T>>;

  // TODO: Lots of these params can be pulled from baseStore.
  constructor(options: StoreConstructorOptions<T>) {
    this.baseStore = options.baseStore;
  }

  abstract on(callback: ProxyCallback<T>): number;
  abstract off(callback: number): void;
  abstract async onProxyMessage(message: ProxyMessage<T>): Promise<void>;
  abstract reportExceptionInHost(exception: PropagatedException): void;

  abstract getLocalModel(muxId: string, id: number): CRDTModel<T>;

  async cloneFrom(store: ActiveMuxer<T>): Promise<void> {
    assert(store instanceof ActiveMuxer);
    const activeMuxer : ActiveMuxer<T> = store as ActiveMuxer<T>;
    for (const muxId of Object.keys(activeMuxer.stores)) {
      await this.onProxyMessage({
        type: ProxyMessageType.ModelUpdate,
        model: activeMuxer.getLocalModel(muxId, 0).getData(),
        id: 0
      });
    }
  }

  getStorageEndpoint() {
    const directStoreMuxer = this;
    let id: number;
    return {
      async onProxyMessage(message: ProxyMessage<T>): Promise<void> {
        message.id = id!;
        noAwait(directStoreMuxer.onProxyMessage(message));
      },
      setCallback(callback: ProxyCallback<T>) {
        id = directStoreMuxer.on(callback);
      },
      reportExceptionInHost(exception: PropagatedException): void {
        directStoreMuxer.reportExceptionInHost(exception);
      },
      getChannelConstructor(): ChannelConstructor {
        return {
          generateID() {
            return null;
          },
          idGenerator: null,
          getStorageProxyMuxer() {
            throw new Error('unimplemented, should not be called');
          },
          reportExceptionInHost(exception: PropagatedException): void {
          }
        };
      }
    };
  }
}
