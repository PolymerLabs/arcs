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
import {Store, StorageMode, ProxyMessageType} from '../store.js';
import {CRDTCountTypeRecord, CRDTCount, CountOpTypes} from '../../crdt/crdt-count.js';
import {VolatileStorageKey, VolatileStorageDriverProvider} from '../drivers/volatile.js';
import {Exists, DriverFactory} from '../drivers/driver-factory.js';
import {Runtime} from '../../runtime.js';

describe('Volatile + Store Integration', async () => {

  beforeEach(() => {
    VolatileStorageDriverProvider.register();
  });

  afterEach(() => {
    DriverFactory.clearRegistrationsForTesting();
  });

  it('will store a sequence of model and operation updates as models', async () => {
    const runtime = new Runtime();
    const storageKey = new VolatileStorageKey('unique');
    const store = new Store<CRDTCountTypeRecord>(storageKey, Exists.ShouldCreate, null, StorageMode.Direct, CRDTCount);
    const activeStore = store.activate();

    const count = new CRDTCount();
    count.applyOperation({type: CountOpTypes.MultiIncrement, actor: 'me', value: 42, version: {from: 0, to: 27}});

    await activeStore.onProxyMessage({type: ProxyMessageType.ModelUpdate, model: count.getData(), id: 1});
    await activeStore.onProxyMessage({type: ProxyMessageType.Operations, operations: [
      {type: CountOpTypes.Increment, actor: 'me', version: {from: 27, to: 28}}
    ], id: 1});
    await activeStore.onProxyMessage({type: ProxyMessageType.Operations, operations: [
      {type: CountOpTypes.Increment, actor: 'them', version: {from: 0, to: 1}}
    ], id: 1});

    const volatileEntry = runtime.getVolatileMemory().entries.get(storageKey);
    assert.deepEqual(volatileEntry.data, activeStore['localModel'].getData());
    assert.equal(volatileEntry.version, 3);
  });

  it('will store operation updates from multiple sources', async () => {
    const runtime = new Runtime();
    const storageKey = new VolatileStorageKey('unique');
    const store1 = new Store<CRDTCountTypeRecord>(storageKey, Exists.ShouldCreate, null, StorageMode.Direct, CRDTCount);
    const activeStore1 = store1.activate();

    const store2 = new Store<CRDTCountTypeRecord>(storageKey, Exists.ShouldExist, null, StorageMode.Direct, CRDTCount);
    const activeStore2 = store2.activate();

    const count1 = new CRDTCount();
    count1.applyOperation({type: CountOpTypes.MultiIncrement, actor: 'me', value: 42, version: {from: 0, to: 27}});
   
    const count2 = new CRDTCount();
    count2.applyOperation({type: CountOpTypes.MultiIncrement, actor: 'them', value: 23, version: {from: 0, to: 15}});

    const modelReply1 = activeStore1.onProxyMessage({type: ProxyMessageType.ModelUpdate, model: count1.getData(), id: 1});
    const modelReply2 = activeStore2.onProxyMessage({type: ProxyMessageType.ModelUpdate, model: count2.getData(), id: 1});

    const opReply1 = activeStore1.onProxyMessage({type: ProxyMessageType.Operations, operations: [
      {type: CountOpTypes.Increment, actor: 'me', version: {from: 27, to: 28}},
      {type: CountOpTypes.Increment, actor: 'other', version: {from: 0, to: 1}}
    ], id: 1});
    const opReply2 = activeStore2.onProxyMessage({type: ProxyMessageType.Operations, operations: [
      {type: CountOpTypes.Increment, actor: 'them', version: {from: 15, to: 16}},
    ], id: 1});
    const opReply3 = activeStore1.onProxyMessage({type: ProxyMessageType.Operations, operations: [
      {type: CountOpTypes.MultiIncrement, actor: 'me', value: 74, version: {from: 28, to: 33}},
    ], id: 1});

    const results = await Promise.all([modelReply1, modelReply2, opReply1, opReply2, opReply3]);
    assert.equal(results.filter(a => !a).length, 0);
    
    const volatileEntry = runtime.getVolatileMemory().entries.get(storageKey);
    assert.deepEqual(volatileEntry.data, activeStore1['localModel'].getData());
    assert.equal(volatileEntry.version, 5);
  });
});
