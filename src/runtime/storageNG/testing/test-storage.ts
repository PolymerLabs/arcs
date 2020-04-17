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
import {CRDTData, CRDTOperation, CRDTTypeRecord, VersionMap} from '../../crdt/crdt.js';
import {Consumer, Dictionary} from '../../hot.js';
import {IdGenerator} from '../../id.js';
import {Particle} from '../../particle.js';
import {StorageDriverProvider} from '../drivers/driver-factory.js';
import {Driver, Exists, ReceiveMethod} from '../drivers/driver.js';
import {Handle} from '../handle.js';
import {StorageKey} from '../storage-key.js';
import {StorageProxy} from '../storage-proxy.js';
import {ActiveStore, ProxyCallback, ProxyMessage, StorageMode, ProxyMessageType} from '../store.js';
import {CountType} from '../../type.js';
import {BackingStore} from '../backing-store.js';


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
  getToken() {
    return null;
  }
  async send(model: Data): Promise<boolean> {
    return true;
  }
}

export class MockStore<T extends CRDTTypeRecord> extends ActiveStore<T> {
  lastCapturedMessage: ProxyMessage<T> = null;
  lastCapturedException: PropagatedException = null;
  crdtData: T['data'] = null;
  callback: ProxyCallback<T> = null;
  // Initial crdtData that will be sent to the proxy in response to SyncRequests.
  constructor(crdtData?: T['data']) {
    super({
      storageKey: new MockStorageKey(),
      exists: Exists.ShouldCreate,
      type: new CountType(),
      mode: StorageMode.Direct,
      baseStore: null,
      versionToken: null
    });
    this.crdtData = crdtData;
  }
  on(callback: ProxyCallback<T>): number {
    this.callback = callback;
    return 1;
  }
  off(callback: number) {
    throw new Error('unimplemented');
  }
  async onProxyMessage(message: ProxyMessage<T>): Promise<void> {
    this.lastCapturedMessage = message;
    if (this.crdtData && message.type === ProxyMessageType.SyncRequest) {
      await this.callback(
          {type: ProxyMessageType.ModelUpdate, model: this.crdtData, id: 1});
    }
  }
  reportExceptionInHost(exception: PropagatedException): void {
    this.lastCapturedException = exception;
  }
  async getLocalData(): Promise<CRDTData> {
    throw new Error('unimplemented');
  }

  async serializeContents(): Promise<T['data']> {
    throw new Error('unimplemented');
  }
}

export class MockBackingStore<T extends CRDTTypeRecord> extends BackingStore<T> {
  lastCapturedMessage: ProxyMessage<T> = null;
  lastCapturedException: PropagatedException = null;
  callback: ProxyCallback<T> = null;
  mockCRDTData: Dictionary<T['data']> = {};
  callbackNum = 0;
  constructor() {
    super({
      storageKey: new MockStorageKey(),
      exists: Exists.ShouldCreate,
      type: null,
      mode: StorageMode.Backing,
      baseStore: null,
      versionToken: null
    });
  }

  on(callback: ProxyCallback<T>): number {
    this.callback = callback;
    return 1;
  }

  off(callback: number) {
    throw new Error('unimplemented');
  }

  async onProxyMessage(message: ProxyMessage<T>): Promise<void> {
    this.lastCapturedMessage = message;
    if (message.type === ProxyMessageType.SyncRequest && this.mockCRDTData[message.muxId] != null) {
      await this.callback({type: ProxyMessageType.ModelUpdate, model: this.mockCRDTData[message.muxId], muxId: message.muxId, id: 1});
    } else if (message.type === ProxyMessageType.ModelUpdate) {
      this.mockCRDTData[message.muxId] = message.model;
    }
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
  onUpdate(op: CRDTOperation) {
    this.lastUpdate = op;
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
  model = null;
  onSyncCalled = false;
  onDesyncCalled = false;
  async callOnHandleUpdate(handle: Handle<CRDTTypeRecord>, update, onException: Consumer<Error>) {
    this.lastUpdate = update;
  }
  async callOnHandleSync(handle: Handle<CRDTTypeRecord>, model, onException: Consumer<Error>) {
    this.model = model;
    this.onSyncCalled = true;
  }
  async callOnHandleDesync(handle: Handle<CRDTTypeRecord>, onException: Consumer<Error>) {
    this.onDesyncCalled = true;
  }
}
