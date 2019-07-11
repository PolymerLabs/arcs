/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {CRDTTypeRecord, CRDTOperation} from '../../crdt/crdt.js';
import {ActiveStore, ProxyMessage, StorageMode, ProxyCallback} from '../store.js';
import {Exists, StorageDriverProvider, Driver, ReceiveMethod} from '../drivers/driver-factory.js';
import {CRDTSingleton} from '../../crdt/crdt-singleton.js';
import {StorageKey} from '../storage-key.js';
import {Handle} from '../handle.js';

/**
 * These classes are intended to provide **extremely** simple fake objects to use
 * when testing StorageNG classes. Methods on these classes should either:
 *  - throw an exception
 *  - implement an obvious default
 *  - store the input
 * 
 * Ideally, the methods shouldn't actually do anything, (i.e. should always throw) 
 * and should be overridden explicitly in testing.
 */

export class MockDriver<Data> extends Driver<Data> {
  receiver: ReceiveMethod<Data>;
  async read(key: StorageKey) { throw new Error('unimplemented'); }
  async write(key: StorageKey, value: {}) { throw new Error('unimplemented'); }
  registerReceiver(receiver: ReceiveMethod<Data>) {
    this.receiver = receiver;
  }
  async send(model: Data): Promise<boolean> {
    return true;
  }
}

export class MockStore<T extends CRDTTypeRecord> extends ActiveStore<T> {
  lastCapturedMessage: ProxyMessage<T> = null;
  constructor() {
    super(new MockStorageKey(), Exists.ShouldCreate, null, StorageMode.Direct, CRDTSingleton);
  }
  on(callback: ProxyCallback<T>): number {
    return 1;
  }
  off(callback: number) {
    throw new Error('unimplemented');
  }
  async onProxyMessage(message: ProxyMessage<T>): Promise<boolean> {
    this.lastCapturedMessage = message;
    return Promise.resolve(true);
  }
}

export class MockStorageKey extends StorageKey {
  constructor() {
    super('testing');
  }

  toString() {
    return `${this.protocol}://`;
  }
  
  childWithComponent(component: string): StorageKey {
    throw new Error('Method not implemented.');
  }
}

export class MockHandle<T extends CRDTTypeRecord> extends Handle<T> {
  onSyncCalled = false;
  lastUpdate: CRDTOperation[] = null;
  onSync() {
    this.onSyncCalled = true;
  }
  onUpdate(ops: CRDTOperation[]) {
    this.lastUpdate = ops;
  }

}

export class MockStorageDriverProvider implements StorageDriverProvider {
  willSupport(storageKey: StorageKey) {
    return true;
  }
  async driver<Data>(storageKey: StorageKey, exists: Exists) {
    return new MockDriver<Data>(storageKey, exists);
  }
}
