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
import {Store, StorageMode, DirectStore, ProxyMessageType} from '../store.js';
import {Exists, DriverFactory, StorageDriverProvider, Driver, ReceiveMethod} from '../drivers/driver-factory.js';
import {CRDTCount, CountOpTypes, CountData, CountOperation} from '../../crdt/crdt-count.js';

class MockDriver<Data> extends Driver<Data> {
  receiver: ReceiveMethod<Data>;
  async read(key: string) { throw new Error("unimplemented"); }
  async write(key: string, value: {}) { throw new Error("unimplemented"); }
  registerReceiver(receiver: ReceiveMethod<Data>) {
    this.receiver = receiver;
  }
  async send(model: Data): Promise<boolean> {
    throw new Error("send implementation required for testing");
  }
}

class MockStorageDriverProvider implements StorageDriverProvider {

  willSupport(storageKey: string) {
    return true;
  }
  driver<Data>(storageKey: string, exists: Exists): Driver<Data> {
    return new MockDriver<Data>(storageKey, exists);
  }
}

describe('Store', async () => {

  afterEach(() => {
    DriverFactory.clearProvidersForTesting();
  });

  it(`will throw an exception if an appropriate driver can't be found`, async () => {
    const store = new Store('string', Exists.ShouldCreate, null, StorageMode.Direct, CRDTCount);
    assert.throws(() => store.activate(), 'No driver exists');
  });

  it('will construct Direct stores when required', async () => {
    DriverFactory.register(new MockStorageDriverProvider());

    const store = new Store('string', Exists.ShouldCreate, null, StorageMode.Direct, CRDTCount);
    const activeStore = store.activate();

    assert.equal(activeStore.constructor, DirectStore);
  });

  it('will propagate model updates from proxies to drivers', async () => {
    DriverFactory.register(new MockStorageDriverProvider());

    const store = new Store('string', Exists.ShouldCreate, null, StorageMode.Direct, CRDTCount);
    const activeStore = store.activate();

    const driver = activeStore['driver'] as MockDriver<CountData>;    
    let capturedModel: CountData = null;
    driver.send = async model => {capturedModel = model; return true;};

    const count = new CRDTCount();
    count.applyOperation({type: CountOpTypes.Increment, actor: 'me', version: {from: 0, to: 1}});

    const result = await activeStore.onProxyMessage({type: ProxyMessageType.ModelUpdate, model: count.getData(), id: 1});
    assert.isTrue(result);

    assert.deepEqual(capturedModel, count.getData());
  });

  it('will apply and propagate operation updates from proxies to drivers', async() => {
    DriverFactory.register(new MockStorageDriverProvider());

    const store = new Store('string', Exists.ShouldCreate, null, StorageMode.Direct, CRDTCount);
    const activeStore = store.activate();

    const driver = activeStore['driver'] as MockDriver<CountData>;
    let capturedModel: CountData = null;
    driver.send = async model => {capturedModel = model; return true;};

    const count = new CRDTCount();
    const operation: CountOperation = {type: CountOpTypes.Increment, actor: 'me', version: {from: 0, to: 1}};

    const result = await activeStore.onProxyMessage({type: ProxyMessageType.Operations, operations: [operation], id: 1});
    assert.isTrue(result);

    count.applyOperation(operation);
     
    assert.deepEqual(capturedModel, count.getData());
  });

  it('will respond to a model request from a proxy with a model', async () => {
    DriverFactory.register(new MockStorageDriverProvider());

    const store = new Store('string', Exists.ShouldCreate, null, StorageMode.Direct, CRDTCount);
    const activeStore = store.activate();

    const driver = activeStore['driver'] as MockDriver<CountData>;
    driver.send = async model => true;

    const count = new CRDTCount();
    const operation: CountOperation = {type: CountOpTypes.Increment, actor: 'me', version: {from: 0, to: 1}};
    count.applyOperation(operation);

    let sentSyncRequest = false;

    return new Promise(async (resolve, reject) => {
      const id = activeStore.on(proxyMessage => {
        if (proxyMessage.type === ProxyMessageType.Operations) {
          assert.isFalse(sentSyncRequest);
          sentSyncRequest = true;
          activeStore.onProxyMessage({type: ProxyMessageType.SyncRequest, id});
          return true;
        }
        assert.isTrue(sentSyncRequest);
        if (proxyMessage.type === ProxyMessageType.ModelUpdate) {
          assert.deepEqual(proxyMessage.model, count.getData());
          resolve(true);
          return true;
        }
        reject();
        return false;
      });

      await activeStore.onProxyMessage({type: ProxyMessageType.Operations, operations: [operation], id});    
    });
  });

  it('will only send a model response to the requesting proxy', async () => {
    DriverFactory.register(new MockStorageDriverProvider());

    const store = new Store('string', Exists.ShouldCreate, null, StorageMode.Direct, CRDTCount);
    const activeStore = store.activate();
    
    return new Promise(async (resolve, reject) => {
      // requesting store
      const id1 = activeStore.on(proxyMessage => {
        assert.equal(proxyMessage.type, ProxyMessageType.ModelUpdate);
        resolve(true);
        return true;
      });

      // another store
      const id2 = activeStore.on(proxyMessage => {
        reject();
        return false;
      });

      await activeStore.onProxyMessage({type: ProxyMessageType.SyncRequest, id: id1});
    });
  });

  it('will propagate updates from drivers to proxies', async () => {
    DriverFactory.register(new MockStorageDriverProvider());

    const store = new Store('string', Exists.ShouldCreate, null, StorageMode.Direct, CRDTCount);
    const activeStore = store.activate();

    const count = new CRDTCount();
    count.applyOperation({type: CountOpTypes.Increment, actor: 'me', version: {from: 0, to: 1}});

    return new Promise(async (resolve, reject) => {
      const id = activeStore.on(proxyMessage => {
        if (proxyMessage.type === ProxyMessageType.Operations) {
          assert.equal(proxyMessage.operations.length, 1);
          assert.equal(proxyMessage.id, id);
          assert.deepEqual(proxyMessage.operations[0], {type: CountOpTypes.MultiIncrement, value: 1, actor: 'me', 
            version: {from: 0, to: 1}});
          resolve(true);
          return true;
        }
        reject();
        return false;
      });
  
      const driver = activeStore['driver'] as MockDriver<CountData>;
      await driver.receiver(count.getData());
    });
  });

  it(`won't send an update to the driver after driver-originated messages`, async () => {
    DriverFactory.register(new MockStorageDriverProvider());

    const store = new Store('string', Exists.ShouldCreate, null, StorageMode.Direct, CRDTCount);
    const activeStore = store.activate();

    const remoteCount = new CRDTCount();
    remoteCount.applyOperation({type: CountOpTypes.Increment, actor: 'them', version: {from: 0, to: 1}});

    const driver = activeStore['driver'] as MockDriver<CountData>;
    driver.send = async model => {throw new Error("Should not be invoked");};

    // Note that this assumes no asynchrony inside store.ts. This is guarded by the following
    // test, which will fail if driver.receiver() doesn't synchronously invoke driver.send(). 
    await driver.receiver(remoteCount.getData());
  });

  it('will resend failed driver updates after merging', async () => {
    DriverFactory.register(new MockStorageDriverProvider());

    const store = new Store('string', Exists.ShouldCreate, null, StorageMode.Direct, CRDTCount);
    const activeStore = store.activate();

    // local count from proxy
    const count = new CRDTCount();
    count.applyOperation({type: CountOpTypes.Increment, actor: 'me', version: {from: 0, to: 1}});
  
    // conflicting remote count from store
    const remoteCount = new CRDTCount();
    remoteCount.applyOperation({type: CountOpTypes.Increment, actor: 'them', version: {from: 0, to: 1}});

    const driver = activeStore['driver'] as MockDriver<CountData>;
    let sendInvoked = false;
    driver.send = async model => {sendInvoked = true; return false;};

    const result = await activeStore.onProxyMessage({type: ProxyMessageType.ModelUpdate, model: count.getData(), id: 1});
    assert.isTrue(result);
    assert.isTrue(sendInvoked);

    sendInvoked = false;
    let capturedModel: CountData = null;
    driver.send = async model => {sendInvoked = true; capturedModel = model; return true;};

    await driver.receiver(remoteCount.getData());
    assert.isTrue(sendInvoked);

    count.merge(remoteCount.getData());
    assert.deepEqual(capturedModel, count.getData());
  });
});
