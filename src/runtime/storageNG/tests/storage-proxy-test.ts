/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {assert} from '../../../platform/chai-web.js';
import {CRDTOperation, CRDTTypeRecord} from '../../crdt/crdt.js';
import {CRDTSingleton, CRDTSingletonTypeRecord, SingletonOperation, SingletonOpTypes} from '../../crdt/crdt-singleton.js';
import {Particle} from '../../particle.js';
import {Exists} from '../drivers/driver-factory.js';
import {Handle} from '../handle.js';
import {StorageKey} from '../storage-key.js';
import {StorageProxy} from '../storage-proxy.js';
import {ActiveStore, StorageMode, ProxyCallback, ProxyMessage, ProxyMessageType} from '../store.js';


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

class MockStorageKey extends StorageKey {
  constructor() {
    super('testing');
  }

  toString() {
    return `${this.protocol}://`;
  }
}

class MockHandle<T extends CRDTTypeRecord> extends Handle<T> {
  onSyncCalled = false;
  lastUpdate: CRDTOperation[] = null;
  onSync() {
    this.onSyncCalled = true;
  }
  onUpdate(ops: CRDTOperation[]) {
    this.lastUpdate = ops;
  }

}

describe('StorageProxy', async () => {
  it('will apply and propagate operation', async () => {
    const mockStore = new MockStore<CRDTSingletonTypeRecord<string>>();
    const storageProxy = new StorageProxy(new CRDTSingleton<string>(), mockStore);

    // Register a handle to verify updates are sent back.
    const handle = new MockHandle<CRDTSingletonTypeRecord<string>>('handle', storageProxy, {} as Particle);
    storageProxy.registerHandle(handle);

    const op: SingletonOperation<string> = {
      type: SingletonOpTypes.Set,
      value: '1',
      actor: 'A',
      clock: new Map([['A', 1]]),
    };
    const result = await storageProxy.applyOp(op);
    assert.isTrue(result);
    assert.deepEqual(mockStore.lastCapturedMessage, {
      type: ProxyMessageType.Operations,
      operations: [op],
      id: 1
    });
    assert.deepEqual(handle.lastUpdate, [op]);
  });

  it('will sync before returning the particle view', async () => {
    const mockStore = new MockStore<CRDTSingletonTypeRecord<string>>();
    const storageProxy = new StorageProxy(new CRDTSingleton<string>(), mockStore);

    // Register a handle to verify updates are sent back.
    const handle = new MockHandle<CRDTSingletonTypeRecord<string>>('handle', storageProxy, {} as Particle);
    storageProxy.registerHandle(handle);

    // When requested a sync, store will send back a model.
    mockStore.onProxyMessage = async message => { 
      mockStore.lastCapturedMessage = message;
      const crdtData = {values: new Map([['1', new Map([['A', 1]])]]), version: new Map([['A', 1]])};
      await storageProxy.onMessage({type: ProxyMessageType.ModelUpdate, model: crdtData, id: 1}); 
      return true; 
    };

    const result: string = await storageProxy.getParticleView();
    assert.equal(result, '1');
    assert.deepEqual(mockStore.lastCapturedMessage, {type: ProxyMessageType.SyncRequest, id: 1});   
    assert.isTrue(handle.onSyncCalled);
  });
  // TODO: Test onMessage
});


