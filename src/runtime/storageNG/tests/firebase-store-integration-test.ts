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
import {Exists, DriverFactory} from '../drivers/driver-factory.js';
import {Runtime} from '../../runtime.js';
import {MockFirebaseStorageDriverProvider, MockFirebaseStorageKey} from '../testing/mock-firebase.js';
import {CountType} from '../../type.js';

describe('Firebase + Store Integration', async () => {

  beforeEach(() => {
    DriverFactory.clearRegistrationsForTesting();
    MockFirebaseStorageDriverProvider.register();
  });

  after(() => {
    DriverFactory.clearRegistrationsForTesting();
  });

  it('will store a sequence of model and operation updates as models', async () => {
    const runtime = new Runtime();
    const storageKey = new MockFirebaseStorageKey('location');
    const store = new Store<CRDTCountTypeRecord>(storageKey, Exists.ShouldCreate, new CountType(), StorageMode.Direct);
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

    await activeStore.idle();
    const firebaseEntry = MockFirebaseStorageDriverProvider.getValueForTesting(storageKey);
    assert.deepEqual(firebaseEntry.model, activeStore['localModel'].getData());
    assert.strictEqual(firebaseEntry.version, 2);
  });

  it('will store operation updates from multiple sources', async () => {
    const runtime = new Runtime();
    const storageKey = new MockFirebaseStorageKey('unique');
    const store1 = new Store<CRDTCountTypeRecord>(storageKey, Exists.ShouldCreate, new CountType(), StorageMode.Direct);
    const activeStore1 = await store1.activate();

    const store2 = new Store<CRDTCountTypeRecord>(storageKey, Exists.ShouldExist, new CountType(), StorageMode.Direct);
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

    await activeStore1.idle();
    await activeStore2.idle();

    const results = await Promise.all([modelReply1, modelReply2, opReply1, opReply2, opReply3]);
    assert.strictEqual(results.filter(a => !a).length, 0);

    const firebaseEntry = MockFirebaseStorageDriverProvider.getValueForTesting(storageKey);
    assert.deepEqual(firebaseEntry.model, activeStore1['localModel'].getData());
    assert.strictEqual(firebaseEntry.version, 3);
  });

  it('will store operation updates from multiple sources with some delays', async () => {
    const runtime = new Runtime();
    const storageKey = new MockFirebaseStorageKey('unique');
    const store1 = new Store<CRDTCountTypeRecord>(storageKey, Exists.ShouldCreate, new CountType(), StorageMode.Direct);
    const activeStore1 = await store1.activate();

    const store2 = new Store<CRDTCountTypeRecord>(storageKey, Exists.ShouldExist, new CountType(), StorageMode.Direct);
    const activeStore2 = await store2.activate();

    void activeStore1.onProxyMessage({type: ProxyMessageType.Operations, id: 1, operations: [
      {type: CountOpTypes.Increment, actor: 'me', version: {from: 0, to: 1}}
    ]});
    void activeStore1.onProxyMessage({type: ProxyMessageType.Operations, id: 1, operations: [
      {type: CountOpTypes.Increment, actor: 'them', version: {from: 0, to: 1}}
    ]});

    await 0;
    await 0;

    void activeStore2.onProxyMessage({type: ProxyMessageType.Operations, id: 1, operations: [
      {type: CountOpTypes.Increment, actor: 'other', version: {from: 0, to: 1}}
    ]});

    await 0;
    await 0;
    await 0;
    await 0;
    await 0;
    await 0;

    void activeStore2.onProxyMessage({type: ProxyMessageType.Operations, id: 1, operations: [
      {type: CountOpTypes.Increment, actor: 'other', version: {from: 1, to: 2}}
    ]});

    await activeStore1.idle();
    await activeStore2.idle();

    assert.deepEqual(activeStore1['localModel'], activeStore2['localModel']);
  });

  // This test is derived from a previously failing sequence test run. The number of awaits is important here,
  // as it allows the specific conditions that were causing deadlock to be established.
  it(`doesn't deadlock given a particular timing pattern`, async () => {
    const runtime = new Runtime();
    const storageKey = new MockFirebaseStorageKey('unique');
    const store1 = new Store<CRDTCountTypeRecord>(storageKey, Exists.ShouldCreate, new CountType(), StorageMode.Direct);
    const activeStore1 = await store1.activate();

    const store2 = new Store<CRDTCountTypeRecord>(storageKey, Exists.ShouldExist, new CountType(), StorageMode.Direct);
    const activeStore2 = await store2.activate();

    void activeStore1.onProxyMessage({type: ProxyMessageType.Operations, id: 1, operations: [
      {type: CountOpTypes.Increment, actor: 'me', version: {from: 0, to: 1}}
    ]});
    void activeStore1.onProxyMessage({type: ProxyMessageType.Operations, id: 1, operations: [
      {type: CountOpTypes.Increment, actor: 'them', version: {from: 0, to: 1}}
    ]});
    void activeStore2.onProxyMessage({type: ProxyMessageType.Operations, id: 1, operations: [
      {type: CountOpTypes.Increment, actor: 'other', version: {from: 0, to: 1}}
    ]});

    await 0;
    await 0;
    await 0;
    await 0;
    await 0;
    await 0;
    await 0;
    await 0;
    await 0;
    await 0;
    await 0;

    void activeStore2.onProxyMessage({type: ProxyMessageType.Operations, id: 1, operations: [
      {type: CountOpTypes.Increment, actor: 'other', version: {from: 1, to: 2}}
    ]});

    await 0;
    await 0;
    await 0;
    await 0;
    await 0;
    await 0;
    await 0;
    await 0;
    await 0;
    await 0;
    await 0;
    await 0;
    await 0;
    await 0;
    await 0;
    await 0;
    await 0;
    await 0;
    await 0;

    await activeStore1.idle();
    await activeStore2.idle();

    assert.deepEqual(activeStore1['localModel'], activeStore2['localModel']);
  });
});
