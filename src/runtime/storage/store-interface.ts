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
import {CRDTTypeRecord} from '../../crdt/lib-crdt.js';
import {Exists} from './drivers/driver.js';
import {StorageFrontend} from './storage-frontend.js';
import {StorageKey} from './storage-key.js';
import {StorageProxy} from './storage-proxy.js';
import {StorageProxyMuxer} from './storage-proxy-muxer.js';
import {CRDTTypeRecordToType, TypeToCRDTTypeRecord} from './storage.js';
import {StoreInfo} from './store-info.js';
import {Type} from '../../types/lib-types.js';
import {DriverFactory} from './drivers/driver-factory.js';

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
  driverFactory: DriverFactory;
};

// Interface common to an ActiveStore and the PEC, used by the StorageProxy.
export interface StorageCommunicationEndpoint<T extends CRDTTypeRecord> {
  storeInfo: StoreInfo<CRDTTypeRecordToType<T>>;
  setCallback(callback: ProxyCallback<T>): void;
  reportExceptionInHost(exception: PropagatedException): void;
  onProxyMessage(message: ProxyMessage<T>): Promise<void>;
  getStorageFrontend(): StorageFrontend;
}
