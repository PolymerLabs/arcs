/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {PropagatedException} from '../../arc-exceptions.js';
import {CRDTSingleton} from '../../crdt/crdt-singleton.js';
import {CRDTConsumerType, CRDTOperation, CRDTTypeRecord, VersionMap} from '../../crdt/crdt.js';
import {Consumer} from '../../hot.js';
import {IdGenerator} from '../../id.js';
import {Particle} from '../../particle';
import {Driver, Exists, ReceiveMethod, StorageDriverProvider} from '../drivers/driver-factory.js';
import {Handle} from '../handle.js';
import {StorageKey} from '../storage-key.js';
import {StorageProxy} from '../storage-proxy.js';
import {ActiveStore, ProxyCallback, ProxyMessage, StorageMode} from '../store.js';
import {Type, ReferenceType, CountType} from '../../type.js';


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
  lastCapturedException: PropagatedException = null;
  constructor() {
    super(new MockStorageKey(), Exists.ShouldCreate, new CountType(), StorageMode.Direct);
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
  reportExceptionInHost(exception: PropagatedException): void {
    this.lastCapturedException = exception;
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

export class MockHierarchicalStorageKey extends StorageKey {
  value: string;

  constructor(segment = '') {
    super('testing-hierarchy');
    this.value = segment;
  }

  toString() {
    return `${this.protocol}://${this.value}`;
  }

  childWithComponent(component: string) {
    return new MockHierarchicalStorageKey(this.value + component);
  }
}

export class MockHandle<T extends CRDTTypeRecord> extends Handle<T> {
  onSyncCalled = false;
  lastUpdate = null;
  constructor(storageProxy: StorageProxy<T>) {
    super('handle', storageProxy, IdGenerator.newSession(), {} as Particle, true, true);
  }
  onSync() {
    this.onSyncCalled = true;
  }
  onUpdate(op: CRDTOperation, oldData: CRDTConsumerType, version: VersionMap) {
    this.lastUpdate = [op, oldData, version];
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

export class MockParticle {
  lastUpdate = null;
  onSyncCalled = false;
  onDesyncCalled = false;
  async callOnHandleUpdate(handle: Handle<CRDTTypeRecord>, update, onException: Consumer<Error>) {
    this.lastUpdate = update;
  }
  async callOnHandleSync(handle: Handle<CRDTTypeRecord>, model, onException: Consumer<Error>) {
    this.onSyncCalled = true;
  }
  async callOnHandleDesync(handle: Handle<CRDTTypeRecord>, onException: Consumer<Error>) {
    this.onDesyncCalled = true;
  }
}
