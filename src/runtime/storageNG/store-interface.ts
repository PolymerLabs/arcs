/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {PropagatedException} from '../arc-exceptions.js';
import {CRDTModel, CRDTTypeRecord} from '../crdt/crdt.js';
import {Type} from '../type.js';
import {Exists} from './drivers/driver-factory.js';
import {StorageKey} from './storage-key.js';

/**
 * This file exists to break a circular dependency between Store and the ActiveStore implementations.
 * Source code outside of the storageNG directory should not import this file directly; instead use
 * store.ts, which re-exports all the useful symbols.
 */

export enum StorageMode {Direct, Backing, ReferenceMode}

export enum ProxyMessageType {SyncRequest, ModelUpdate, Operations}

export type ProxyMessage<T extends CRDTTypeRecord> = {type: ProxyMessageType.SyncRequest, id: number} | 
  {type: ProxyMessageType.ModelUpdate, model: T['data'], id: number} |
  {type: ProxyMessageType.Operations, operations: T['operation'][], id: number}; 

export type ProxyCallback<T extends CRDTTypeRecord> = (message: ProxyMessage<T>) => Promise<boolean>;

export type StoreInterface<T extends CRDTTypeRecord> = {
  readonly storageKey: StorageKey;
  exists: Exists;
  readonly type: Type;
  readonly mode: StorageMode;
};

// A representation of an active store. Subclasses of this class provide specific
// behaviour as controlled by the provided StorageMode.
export abstract class ActiveStore<T extends CRDTTypeRecord> implements StoreInterface<T> {
  readonly storageKey: StorageKey;
  exists: Exists;
  readonly type: Type;
  readonly mode: StorageMode;

  constructor(storageKey: StorageKey, exists: Exists, type: Type, mode: StorageMode) {
    this.storageKey = storageKey;
    this.exists = exists;
    this.type = type;
    this.mode = mode;
  }
  
  async idle() {
    return Promise.resolve();
  }

  abstract on(callback: ProxyCallback<T>): number;
  abstract off(callback: number): void;
  abstract async onProxyMessage(message: ProxyMessage<T>): Promise<boolean>;
  abstract reportExceptionInHost(exception: PropagatedException): void;
}
