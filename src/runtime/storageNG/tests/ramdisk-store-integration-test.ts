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
import {RamDiskStorageKey, RamDiskStorageDriverProvider} from '../drivers/ramdisk';
import {Exists, DriverFactory} from '../drivers/driver-factory.js';
import {Runtime} from '../../runtime.js';
import {CountType} from '../../type.js';

describe('RamDisk + Store Integration', async () => {

  beforeEach(() => {
    RamDiskStorageDriverProvider.register();
  });

  afterEach(() => {
    DriverFactory.clearRegistrationsForTesting();
  });

  it('will store a sequence of model and operation updates as models', async () => {
    const runtime = new Runtime();
    const storageKey = new RamDiskStorageKey('unique');
    const store = new Store<CRDTCountTypeRecord>(storageKey, Exists.ShouldCreate, new CountType(), 'an-id');
    const activeStore = await store.activate();

    const count = new CRDTCount();
    count.applyOperation({type: CountOpTypes.MultiIncrement, actor: 'me', value: 42, version: {from: 0, to: 27}});

    await activeStore.onProxyMessage({type: ProxyMessageType.ModelUpdate, model: count.getData(), id: 1});
    await activeStore.onProxyMessage({type: ProxyMessageType.Operations, operations: [
      {type: CountOpTypes.Increment, actor: 'me', version: {from: 27, to: 28}}
    ], id: 1});
    await activeStore.onProxyMessage({type: ProxyMessageType.Operations, operations: [
      {type: CountOpTypes.Increment, actor: 'them', version: {from: 0, to: 1}}
    ], id: 1});

    const volatileEntry = runtime.getRamDiskMemory().entries.get(storageKey.toString());
    assert.deepEqual(volatileEntry.data, activeStore['localModel'].getData());
    assert.strictEqual(volatileEntry.version, 3);
  });

  it('will store operation updates from multiple sources', async () => {
    const runtime = new Runtime();
    const storageKey = new RamDiskStorageKey('unique');
    const store1 = new Store<CRDTCountTypeRecord>(storageKey, Exists.ShouldCreate, new CountType(), 'an-id');
    const activeStore1 = await store1.activate();

    const store2 = new Store<CRDTCountTypeRecord>(storageKey, Exists.ShouldExist, new CountType(), 'an-id');
    const activeStore2 = await store2.activate();

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
    assert.strictEqual(results.filter(a => !a).length, 0);
    
    await activeStore1.idle();
    await activeStore2.idle();

    const volatileEntry = runtime.getRamDiskMemory().entries.get(storageKey.toString());
    assert.deepEqual(volatileEntry.data, activeStore1['localModel'].getData());
    assert.strictEqual(volatileEntry.version, 3);
  });

  it('will store operation updates from multiple sources with some timing delays', async () => {
    // store1.onProxyMessage, DELAY, DELAY, DELAY, store1.onProxyMessage, store2.onProxyMessage, DELAY, DELAY, DELAY, store2.onProxyMessage, DELAY, DELAY, DELAY, DELAY, DELAY
    const runtime = new Runtime();
    const storageKey = new RamDiskStorageKey('unique');
    const store1 = new Store<CRDTCountTypeRecord>(storageKey, Exists.ShouldCreate, new CountType(), 'an-id');
    const activeStore1 = await store1.activate();

    const store2 = new Store<CRDTCountTypeRecord>(storageKey, Exists.ShouldExist, new CountType(), 'an-id');
    const activeStore2 = await store2.activate();

    const opReply1 = activeStore1.onProxyMessage({type: ProxyMessageType.Operations, operations: [
      {type: CountOpTypes.Increment, actor: 'me', version: {from: 0, to: 1}}
    ], id: 1});

    await 0;
    await 0;
    await 0;

    const opReply2 = activeStore1.onProxyMessage({type: ProxyMessageType.Operations, operations: [
      {type: CountOpTypes.Increment, actor: 'them', version: {from: 0, to: 1}},
    ], id: 1});

    const opReply3 = activeStore2.onProxyMessage({type: ProxyMessageType.Operations, operations: [
      {type: CountOpTypes.Increment, actor: 'other', version: {from: 0, to: 1}},
    ], id: 1});

    await 0;
    await 0;
    await 0;

    const opReply4 = activeStore2.onProxyMessage({type: ProxyMessageType.Operations, operations: [
      {type: CountOpTypes.Increment, actor: 'other', version: {from: 1, to: 2}},
    ], id: 1});

    const results = await Promise.all([opReply1, opReply2, opReply3, opReply4]);
    assert.strictEqual(results.filter(a => !a).length, 0);
    
    await activeStore1.idle();
    await activeStore2.idle();

    const volatileEntry = runtime.getRamDiskMemory().entries.get(storageKey.toString());
    assert.deepEqual(volatileEntry.data, activeStore1['localModel'].getData());
    assert.strictEqual(volatileEntry.version, 4);
  });
});
