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
import {StorageKey} from './storage-key.js';
import {CRDTTypeRecordToType} from './storage.js';
import {StoreInfo} from './store-info.js';
import {StoreInterface, StorageMode, StoreConstructorOptions, ProxyMessageType, ProxyCallback, ProxyMessage} from './store-interface.js';

// A representation of an active store. Subclasses of this class provide specific
// behaviour as controlled by the provided StorageMode.
export abstract class ActiveStore<T extends CRDTTypeRecord> implements StoreInterface<T> {
  readonly storageKey: StorageKey;
  exists: Exists;
  readonly type: CRDTTypeRecordToType<T>;
  readonly storeInfo: StoreInfo<CRDTTypeRecordToType<T>>;

  static constructors : Map<StorageMode, StoreConstructor> = null;

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

  async cloneFrom(activeStore: ActiveStore<T>): Promise<void> {
    // TODO(shans): work out what ID to use for messages that aren't from an established
    // channel, like these.
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
}

export type StoreConstructor = {
  construct<T extends CRDTTypeRecord>(options: StoreConstructorOptions<T>): Promise<ActiveStore<T>>;
};
