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
import {ProxyMessageType} from '../store-interface.js';
import {CRDTCountTypeRecord, CRDTCount, CountOpTypes} from '../../../crdt/lib-crdt.js';
import {DriverFactory} from '../drivers/driver-factory.js';
import {Exists} from '../drivers/driver.js';
import {Runtime} from '../../runtime.js';
import {MockFirebaseStorageDriverProvider, MockFirebaseStorageKey} from '../testing/mock-firebase.js';
import {CountType} from '../../../types/lib-types.js';
import {StorageKey} from '../storage-key.js';
import {StoreInfo} from '../store-info.js';
import {ActiveStore} from '../active-store.js';
import {DirectStorageEndpointManager} from '../direct-storage-endpoint-manager.js';

async function createStore(storageKey: StorageKey, exists: Exists): Promise<ActiveStore<CRDTCountTypeRecord>> {
  return (await new DirectStorageEndpointManager().getActiveStore(new StoreInfo({
      storageKey, type: new CountType(), exists, id: 'an-id'}))) as ActiveStore<CRDTCountTypeRecord>;
}

describe('Firebase + Store Integration', async () => {
  let runtime;
  beforeEach(() => {
    Runtime.resetDrivers();
    runtime = new Runtime();
    MockFirebaseStorageDriverProvider.register(runtime.getCacheService());
  });

  after(() => {
    Runtime.resetDrivers();
  });

  it('will store a sequence of model and operation updates as models', async () => {
    const storageKey = new MockFirebaseStorageKey('location');
    const activeStore = await createStore(storageKey, Exists.ShouldCreate);

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
    const firebaseEntry = MockFirebaseStorageDriverProvider.getValueForTesting(runtime.getCacheService(), storageKey);
    assert.deepEqual(firebaseEntry.model, activeStore['localModel'].getData());
    assert.strictEqual(firebaseEntry.version, 2);
  });

  it('will store operation updates from multiple sources', async () => {
    const storageKey = new MockFirebaseStorageKey('unique');
    const activeStore1 = await createStore(storageKey, Exists.ShouldCreate);
    const activeStore2 = await createStore(storageKey, Exists.ShouldExist);

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

    await Promise.all([modelReply1, modelReply2, opReply1, opReply2, opReply3]);

    const firebaseEntry = MockFirebaseStorageDriverProvider.getValueForTesting(
        runtime.getCacheService(), storageKey);
    assert.deepEqual(firebaseEntry.model, activeStore1['localModel'].getData());
    assert.strictEqual(firebaseEntry.version, 3);
  });

  it('will store operation updates from multiple sources with some delays', async () => {
    const storageKey = new MockFirebaseStorageKey('unique');
    const activeStore1 = await createStore(storageKey, Exists.ShouldCreate);
    const activeStore2 = await createStore(storageKey, Exists.ShouldExist);

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
    const storageKey = new MockFirebaseStorageKey('unique');
    const activeStore1 = await createStore(storageKey, Exists.ShouldCreate);
    const activeStore2 = await createStore(storageKey, Exists.ShouldExist);

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
