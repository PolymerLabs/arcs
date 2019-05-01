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
import {CRDTCount, CRDTCountTypeRecord, CountOpTypes, CountData, CountOperation} from '../../crdt/crdt-count.js';

class MockDriver<Data> extends Driver<Data> {
  receiver: ReceiveMethod<Data>;
  latestModel: Data;
  async read(key: string) { throw new Error("unimplemented"); }
  async write(key: string, value: {}) { throw new Error("unimplemented"); }
  registerReceiver(receiver: ReceiveMethod<Data>) {
    this.receiver = receiver;
  }
  async send(model: Data) {
    this.latestModel = model;
    return true;
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

    const count = new CRDTCount();
    count.applyOperation({type: CountOpTypes.Increment, actor: 'me', version: {from: 0, to: 1}});

    const result = await activeStore.onProxyMessage({type: ProxyMessageType.ModelUpdate, model: count.getData()});
    assert.isTrue(result);

    const driver = activeStore['driver'] as MockDriver<CountData>;
    assert.deepEqual(driver.latestModel, count.getData());
  });

  it('will apply and propagate operation updates from proxies to drivers', async() => {
    DriverFactory.register(new MockStorageDriverProvider());

    const store = new Store('string', Exists.ShouldCreate, null, StorageMode.Direct, CRDTCount);
    const activeStore = store.activate();

    const count = new CRDTCount();
    const operation: CountOperation = {type: CountOpTypes.Increment, actor: 'me', version: {from: 0, to: 1}};

    const result = await activeStore.onProxyMessage({type: ProxyMessageType.Operations, operations: [operation]});
    assert.isTrue(result);

    count.applyOperation(operation);

    const driver = activeStore['driver'] as MockDriver<CountData>;
    assert.deepEqual(driver.latestModel, count.getData());
  });

  it('will propagate updates from drivers to proxies', async () => {
    DriverFactory.register(new MockStorageDriverProvider());

    const store = new Store('string', Exists.ShouldCreate, null, StorageMode.Direct, CRDTCount);
    const activeStore = store.activate();

    const count = new CRDTCount();
    count.applyOperation({type: CountOpTypes.Increment, actor: 'me', version: {from: 0, to: 1}});

    return new Promise(async (resolve, reject) => {
      activeStore.on(proxyMessage => {
        if (proxyMessage.type === ProxyMessageType.Operations) {
          assert.equal(proxyMessage.operations.length, 1);
          assert.deepEqual(proxyMessage.operations[0], {type: CountOpTypes.MultiIncrement, value: 1, actor: 'me', 
            version: {from: 0, to: 1}});
        }
        resolve(true);
        return true;
      });
  
      const driver = activeStore['driver'] as MockDriver<CountData>;
      await driver.receiver(count.getData());
    });
  });
});