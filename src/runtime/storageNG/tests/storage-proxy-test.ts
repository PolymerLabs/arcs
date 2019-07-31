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
import {CRDTSingleton, CRDTSingletonTypeRecord, SingletonOperation, SingletonOpTypes} from '../../crdt/crdt-singleton.js';
import {Particle} from '../../particle.js';
import {StorageProxy, StorageProxyScheduler} from '../storage-proxy.js';
import {ActiveStore, ProxyMessageType} from '../store.js';
import {MockHandle, MockStore} from '../testing/test-storage.js';
import {EntityType} from '../../type.js';

interface Entity {
  id: string;
}

function getStorageProxy(store: ActiveStore<CRDTSingletonTypeRecord<Entity>>): StorageProxy<CRDTSingletonTypeRecord<Entity>> {
  return new StorageProxy(new CRDTSingleton<Entity>(), store, 'id', EntityType.make([], {}), null /*pec*/);
} 

describe('StorageProxy', async () => {
  it('will apply and propagate operation', async () => {
    const mockStore = new MockStore<CRDTSingletonTypeRecord<Entity>>();
    const storageProxy = getStorageProxy(mockStore);

    // Register a handle to verify updates are sent back.
    const handle = new MockHandle<CRDTSingletonTypeRecord<Entity>>(storageProxy);

    const op: SingletonOperation<Entity> = {
      type: SingletonOpTypes.Set,
      value: {id: 'e1'},
      actor: 'A',
      clock: {A: 1}
    };
    const result = await storageProxy.applyOp(op);
    assert.isTrue(result);
    assert.deepEqual(mockStore.lastCapturedMessage, {
      type: ProxyMessageType.Operations,
      operations: [op],
      id: 1
    });
    await storageProxy.idle();
    assert.sameDeepMembers(handle.lastUpdate, [op]);
  });

  it('will sync before returning the particle view', async () => {
    const mockStore = new MockStore<CRDTSingletonTypeRecord<Entity>>();
    const storageProxy = getStorageProxy(mockStore);

    // Register a handle to verify updates are sent back.
    const handle = new MockHandle<CRDTSingletonTypeRecord<Entity>>(storageProxy);

    // When requested a sync, store will send back a model.
    mockStore.onProxyMessage = async message => { 
      mockStore.lastCapturedMessage = message;
      const crdtData = {values: {'1': {value: {id: 'e1'}, version: {A: 1}}}, version: {A: 1}};
      await storageProxy.onMessage({type: ProxyMessageType.ModelUpdate, model: crdtData, id: 1}); 
      return true; 
    };

    const result: Entity = await storageProxy.getParticleView();
    assert.deepEqual(result, {id: 'e1'});
    assert.deepEqual(
        mockStore.lastCapturedMessage,
        {type: ProxyMessageType.SyncRequest, id: 1});
    await storageProxy.idle();
    assert.isTrue(handle.onSyncCalled);
  });

  it('can exchange models with the store', async () => {
    const mockStore = new MockStore<CRDTSingletonTypeRecord<Entity>>();
    const storageProxy = getStorageProxy(mockStore);

    // Registering a handle trigger the proxy to connect to the store and fetch the model.
    const handle = new MockHandle<CRDTSingletonTypeRecord<Entity>>(storageProxy);
    assert.deepEqual(
        mockStore.lastCapturedMessage,
        {type: ProxyMessageType.SyncRequest, id: 1});

    const crdtData = {
      values: {'e1': {value: {id: 'e1'}, version: {A: 1}}},
      version: {A: 1}
    };
    // Send a model to the proxy.
    await storageProxy.onMessage(
        {type: ProxyMessageType.ModelUpdate, model: crdtData, id: 1});
    // Request model from the proxy.
    await storageProxy.onMessage({type: ProxyMessageType.SyncRequest, id: 1});
    assert.deepEqual(
        mockStore.lastCapturedMessage,
        {type: ProxyMessageType.ModelUpdate, id: 1, model: crdtData});
  });

  it('propagates exceptions to the store', async () => {
    const mockStore = new MockStore<CRDTSingletonTypeRecord<Entity>>();
    const storageProxy = getStorageProxy(mockStore);

    const handle = new MockHandle<CRDTSingletonTypeRecord<Entity>>(storageProxy);
    handle.onSync = () => {
      throw new Error('something wrong');
    };

    // When requested a sync, store will send back a model.
    mockStore.onProxyMessage = async message => {
      mockStore.lastCapturedMessage = message;
      const crdtData = {
        values: {'1': {value: {id: 'e1'}, version: {A: 1}}},
        version: {A: 1}
      };
      await storageProxy.onMessage(
          {type: ProxyMessageType.ModelUpdate, model: crdtData, id: 1});
      return true;
    };

    await storageProxy.getParticleView();
    await storageProxy.idle();
    assert.equal(
        mockStore.lastCapturedException.message,
        'SystemException: exception Error raised when invoking system function StorageProxyScheduler::_dispatch on behalf of particle handle: something wrong');
  });
});
