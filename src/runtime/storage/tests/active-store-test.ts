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
import {Exists} from '../drivers/driver.js';
import {CRDTTypeRecord, CRDTCount, CountOpTypes, CountData, CountOperation} from '../../../crdt/lib-crdt.js';
import {StorageKey} from '../storage-key.js';
import {DirectStore} from '../direct-store.js';
import {MockStorageKey, MockStorageDriverProvider, MockDriver} from '../testing/test-storage.js';
import {CountType} from '../../../types/lib-types.js';
import {noAwait} from '../../../utils/lib-utils.js';
import {StoreInfo} from '../store-info.js';
import {ActiveStore} from '../active-store.js';
import {DirectStorageEndpointManager} from '../direct-storage-endpoint-manager.js';
import {Runtime} from '../../runtime.js';

describe('Store', async () => {
  let driverFactory;
  let testKey: StorageKey;
  async function createStore(): Promise<ActiveStore<CRDTTypeRecord>> {
    const info = new StoreInfo({storageKey: testKey, type: new CountType(), exists: Exists.ShouldCreate, id: 'an-id'});
    const endpoints = new DirectStorageEndpointManager();
    return endpoints.getActiveStore(info);
  }
  beforeEach(() => {
    testKey = new MockStorageKey();
    driverFactory = (new Runtime()).driverFactory;
  });

  it(`will throw an exception if an appropriate driver can't be found`, async () => {
    try {
      await createStore();
      assert.fail('store.activate() should not have succeeded');
    } catch (e) {
      assert.match(e.toString(), /No driver exists/);
    }
  });

  it('will construct Direct stores when required', async () => {
    driverFactory.register(new MockStorageDriverProvider());

    const activeStore = await createStore();

    assert.strictEqual(activeStore.constructor, DirectStore);
  });

  it('will propagate model updates from proxies to drivers', async () => {
    driverFactory.register(new MockStorageDriverProvider());

    const activeStore = await createStore();

    const driver = activeStore['driver'] as MockDriver<CountData>;
    let capturedModel: CountData = null;
    driver.send = async model => {capturedModel = model; return true;};

    const count = new CRDTCount();
    count.applyOperation({type: CountOpTypes.Increment, actor: 'me', version: {from: 0, to: 1}});

    await activeStore.onProxyMessage({type: ProxyMessageType.ModelUpdate, model: count.getData(), id: 1});

    assert.deepEqual(capturedModel, count.getData());
  });

  it('will apply and propagate operation updates from proxies to drivers', async () => {
    driverFactory.register(new MockStorageDriverProvider());

    const activeStore = await createStore();

    const driver = activeStore['driver'] as MockDriver<CountData>;
    let capturedModel: CountData = null;
    driver.send = async model => {capturedModel = model; return true;};

    const count = new CRDTCount();
    const operation: CountOperation = {type: CountOpTypes.Increment, actor: 'me', version: {from: 0, to: 1}};

    await activeStore.onProxyMessage({type: ProxyMessageType.Operations, operations: [operation], id: 1});

    count.applyOperation(operation);

    assert.deepEqual(capturedModel, count.getData());
  });

  it('will respond to a model request from a proxy with a model', async () => {
    driverFactory.register(new MockStorageDriverProvider());

    const activeStore = await createStore();

    const driver = activeStore['driver'] as MockDriver<CountData>;
    driver.send = async model => true;

    const count = new CRDTCount();
    const operation: CountOperation = {type: CountOpTypes.Increment, actor: 'me', version: {from: 0, to: 1}};
    count.applyOperation(operation);

    let sentSyncRequest = false;

    return new Promise<boolean>((resolve, reject) => {
      const id = activeStore.on(async proxyMessage => {
        if (proxyMessage.type === ProxyMessageType.Operations) {
          assert.isFalse(sentSyncRequest);
          sentSyncRequest = true;
          noAwait(activeStore.onProxyMessage({type: ProxyMessageType.SyncRequest, id}));
          return;
        }
        assert.isTrue(sentSyncRequest);
        if (proxyMessage.type === ProxyMessageType.ModelUpdate) {
          assert.deepEqual(proxyMessage.model, count.getData());
          resolve(true);
          return;
        }
        throw new Error();
      });

      noAwait(activeStore.onProxyMessage({type: ProxyMessageType.Operations, operations: [operation], id: id + 1}));
    });
  });

  it('will only send a model response to the requesting proxy', async () => {
    driverFactory.register(new MockStorageDriverProvider());

    const activeStore = await createStore();

    return new Promise<boolean>((resolve, reject) => {
      // requesting store
      const id1 = activeStore.on(async proxyMessage => {
        assert.strictEqual(proxyMessage.type, ProxyMessageType.ModelUpdate);
        resolve(true);
      });

      // another store
      const id2 = activeStore.on(proxyMessage => {
        throw new Error();
      });

      const result = activeStore.onProxyMessage({type: ProxyMessageType.SyncRequest, id: id1});
    });
  });

  it('will propagate updates from drivers to proxies', async () => {
    driverFactory.register(new MockStorageDriverProvider());

    const activeStore = await createStore();

    const count = new CRDTCount();
    count.applyOperation({type: CountOpTypes.Increment, actor: 'me', version: {from: 0, to: 1}});

    return new Promise<boolean>((resolve, reject) => {
      const id = activeStore.on(async proxyMessage => {
        if (proxyMessage.type === ProxyMessageType.Operations) {
          assert.strictEqual(proxyMessage.operations.length, 1);
          assert.strictEqual(proxyMessage.id, id);
          assert.deepEqual(proxyMessage.operations[0], {type: CountOpTypes.MultiIncrement, value: 1, actor: 'me',
            version: {from: 0, to: 1}});
          resolve(true);
          return;
        }
        throw new Error();
      });

      const driver = activeStore['driver'] as MockDriver<CountData>;
      driver.receiver(count.getData(), 1);
    });
  });

  it('can clone data from another store', async () => {
    driverFactory.register(new MockStorageDriverProvider());

    const activeStore = await createStore();
    // Write some data.
    const count = new CRDTCount();
    count.applyOperation({type: CountOpTypes.Increment, actor: 'me', version: {from: 0, to: 1}});
    await activeStore.onProxyMessage({type: ProxyMessageType.ModelUpdate, model: count.getData(), id: 1});
    assert.deepEqual(await activeStore.serializeContents(), count.getData());
    // Clone into another store.
    const activeStore2 = await createStore();
    await activeStore2.cloneFrom(activeStore);
    assert.deepEqual(await activeStore2.serializeContents(), count.getData());
  });

  it(`won't send an update to the driver after driver-originated messages`, async () => {
    driverFactory.register(new MockStorageDriverProvider());

    const activeStore = await createStore();

    const remoteCount = new CRDTCount();
    remoteCount.applyOperation({type: CountOpTypes.Increment, actor: 'them', version: {from: 0, to: 1}});

    const driver = activeStore['driver'] as MockDriver<CountData>;
    driver.send = async model => {throw new Error('Should not be invoked');};

    // Note that this assumes no asynchrony inside store.ts. This is guarded by the following
    // test, which will fail if driver.receiver() doesn't synchronously invoke driver.send().
    await driver.receiver(remoteCount.getData(), 1);
  });

  it('will resend failed driver updates after merging', async () => {
    driverFactory.register(new MockStorageDriverProvider());

    const activeStore = await createStore();

    // local count from proxy
    const count = new CRDTCount();
    count.applyOperation({type: CountOpTypes.Increment, actor: 'me', version: {from: 0, to: 1}});

    // conflicting remote count from store
    const remoteCount = new CRDTCount();
    remoteCount.applyOperation({type: CountOpTypes.Increment, actor: 'them', version: {from: 0, to: 1}});

    const driver = activeStore['driver'] as MockDriver<CountData>;
    let sendInvoked = false;
    driver.send = async model => {sendInvoked = true; return false;};

    await activeStore.onProxyMessage({type: ProxyMessageType.ModelUpdate, model: count.getData(), id: 1});
    assert.isTrue(sendInvoked);

    sendInvoked = false;
    let capturedModel: CountData = null;
    driver.send = async model => {sendInvoked = true; capturedModel = model; return true;};

    await driver.receiver(remoteCount.getData(), 1);
    assert.isTrue(sendInvoked);

    count.merge(remoteCount.getData());
    assert.deepEqual(capturedModel, count.getData());
  });

  it('resolves a combination of messages from the proxy and the driver', async () => {
    driverFactory.register(new MockStorageDriverProvider());
    const activeStore = await createStore();
    const driver = activeStore['driver'] as MockDriver<CountData>;
    let lastModel = null;
    driver.send = async model => {lastModel = model; return true;};

    void activeStore.onProxyMessage({type: ProxyMessageType.Operations, id: 1, operations: [
      {type: CountOpTypes.Increment, actor: 'me', version: {from: 0, to: 1}}
    ]});
    void activeStore.onProxyMessage({type: ProxyMessageType.Operations, id: 1, operations: [
      {type: CountOpTypes.Increment, actor: 'me', version: {from: 1, to: 2}}
    ]});
    void activeStore.onProxyMessage({type: ProxyMessageType.Operations, id: 1, operations: [
      {type: CountOpTypes.Increment, actor: 'me', version: {from: 2, to: 3}}
    ]});
    driver.receiver({values: {me: 1, them: 1}, version: {me: 1, them: 1}}, 1);
    driver.receiver({values: {me: 1, them: 2}, version: {me: 1, them: 2}}, 2);

    await activeStore.idle();

    assert.deepEqual(activeStore['localModel'].model, lastModel);
  });
});
