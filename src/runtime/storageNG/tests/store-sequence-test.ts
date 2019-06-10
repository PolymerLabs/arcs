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
import {Store, StorageMode, ActiveStore, ProxyMessageType, ProxyMessage} from '../store.js';
import {SequenceTest, ExpectedResponse, SequenceOutput} from '../../testing/sequence.js';
import {CRDTCountTypeRecord, CRDTCount, CountOpTypes, CountData} from '../../crdt/crdt-count.js';
import {DriverFactory, Driver, ReceiveMethod, StorageDriverProvider, Exists} from '../drivers/driver-factory.js';
import {StorageKey} from '../storage-key.js';
import {Runtime} from '../../runtime.js';
import {VolatileStorageKey, VolatileStorageDriverProvider} from '../drivers/volatile.js';
import {Dictionary} from '../../hot.js';

class MockDriver<Data> extends Driver<Data> {
  receiver: ReceiveMethod<Data>;
  async read(key: StorageKey) { throw new Error('unimplemented'); }
  async write(key: StorageKey, value: {}) { throw new Error('unimplemented'); }
  registerReceiver(receiver: ReceiveMethod<Data>) {
    this.receiver = receiver;
  }
  async send(model: Data): Promise<boolean> {
    return true;
  }
}

class MockStorageDriverProvider implements StorageDriverProvider {
  willSupport(storageKey: StorageKey) {
    return true;
  }
  async driver<Data>(storageKey: StorageKey, exists: Exists) {
    return new MockDriver<Data>(storageKey, exists);
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

let testKey: StorageKey;

const incOp = (actor: string, from: number): ProxyMessage<CRDTCountTypeRecord> => (
  {
    type: ProxyMessageType.Operations,
    operations: [{type: CountOpTypes.Increment, actor, version: {from, to: from + 1}}],
    id: 1
  });

const makeSimpleModel = (meCount: number, themCount: number, meVersion: number, themVersion: number): CountData =>
  ({values: new Map([['me', meCount], ['them', themCount]]),
    version: new Map([['me', meVersion], ['them', themVersion]])});

const makeModel = (countDict: Dictionary<number>, versionDict: Dictionary<number>): CountData =>
  ({values: new Map(Object.entries(countDict)), version: new Map(Object.entries(versionDict))});

describe('Store Flow', async () => {

  before(() => {testKey = new MockStorageKey();});

  // Tests a model resync request happening synchronously with model updates from the driver
  it('services a model request and applies 2 models', async () => {
    const sequenceTest = new SequenceTest<ActiveStore<CRDTCountTypeRecord>>();
    sequenceTest.setTestConstructor(async () => {
      DriverFactory.clearRegistrationsForTesting();
      DriverFactory.register(new MockStorageDriverProvider());

      const store = new Store(testKey, Exists.ShouldCreate, null, StorageMode.Direct, CRDTCount);
      const activeStore = store.activate();
      return activeStore;
    });

    const onProxyMessage = sequenceTest.registerInput('onProxyMessage', 3, 
      {type: ExpectedResponse.Constant, response: true});
    const onReceive = sequenceTest.registerInput('onReceive', 3, {type: ExpectedResponse.Void}); 

    const send = sequenceTest.registerOutput('driver.send',
      {
        type: ExpectedResponse.Defer,
        default: true,
      }, SequenceOutput.Replace);

    const idVar = sequenceTest.registerVariable(-1);
    const isSyncRequest = sequenceTest.registerVariable(false);
    const model = sequenceTest.registerVariable(() => new CRDTCount(), true);

    const on = sequenceTest.registerOutput('on',
      {
        type: ExpectedResponse.Constant,
        response: true,
        onOutput: (value: ProxyMessage<CRDTCountTypeRecord>) => {
          const syncRequest = sequenceTest.getVariable(isSyncRequest);
          if (syncRequest) {
            assert.equal(value.type, ProxyMessageType.ModelUpdate);
            sequenceTest.setVariable(isSyncRequest, false);
          } else {
            if (value.type === ProxyMessageType.Operations) {
              const currModel: CRDTCount = sequenceTest.getVariable(model);
              for (const operation of value.operations) {
                assert.isTrue(currModel.applyOperation(operation));
              }
            } else {
              assert.fail();
            }
          }
        }
      }, SequenceOutput.Register, idVar);

    const storageProxyChanges: {inputFn: () => [ProxyMessage<CRDTCountTypeRecord>], variable: {}}[]
      = [{inputFn: () => [{type: ProxyMessageType.SyncRequest, id: sequenceTest.getVariable(idVar)}],
          variable: {[isSyncRequest]: true}}];

    const driverChanges = [
      {output: {[send]: false}},
      {input: [makeSimpleModel(7, 12, 3, 4)], output: {[send]: true}},
      {output: {[send]: false}},
      {input: [makeSimpleModel(8, 12, 4, 4)], output: {[send]: true}}
    ];

    sequenceTest.setChanges(onProxyMessage, storageProxyChanges);
    sequenceTest.setChanges(onReceive, driverChanges);

    await sequenceTest.test();
  });

  // TODO(sjmiles): empirically, 10s timeout isn't long enough for Travis to complete regularly, skipping 
  // next test for now
  
  // Tests 3 operation updates happening synchronously with 2 model updates from the driver
  it.skip('applies 3 operations and 2 models simultaneously', async function() {    

    this.timeout(10000);

    const sequenceTest = new SequenceTest<ActiveStore<CRDTCountTypeRecord>>();
    sequenceTest.setTestConstructor(async () => {
      DriverFactory.clearRegistrationsForTesting();
      DriverFactory.register(new MockStorageDriverProvider());

      const store = new Store(testKey, Exists.ShouldCreate, null, StorageMode.Direct, CRDTCount);
      const activeStore = store.activate();
      return activeStore;
    });

    const onProxyMessage = sequenceTest.registerInput('onProxyMessage', 3, {type: ExpectedResponse.Constant, response: true});
    const onReceive = sequenceTest.registerInput('onReceive', 3, {type: ExpectedResponse.Void}); 

    const meCount = sequenceTest.registerVariable(0);

    const send = sequenceTest.registerOutput('driver.send',
      {
        type: ExpectedResponse.Defer,
        default: true,
        onOutput: (model => {
          if (sequenceTest.getOutput(send)) {
            sequenceTest.setVariable(meCount, model.values.get('me'));
          }
        })
      }, SequenceOutput.Replace);

    const model = sequenceTest.registerSensor('localModel');
    const inSync = sequenceTest.registerSensor('inSync');

    const storageProxyChanges = [{input: [incOp('me', 0)]}, {input: [incOp('me', 1)]}, {input: [incOp('me', 2)]}];

    const driverChanges = [
      {output: {[send]: false}}, // at some point data arrives at the driver
      // the sendCount at driverChanges[0] is the inc count for ‘me’
      {inputFn: () => [makeSimpleModel(sequenceTest.getVariable(meCount), 1, sequenceTest.getVariable(meCount), 1), 1], output: {[send]: true}},
      {output: {[send]: false}}, // more data arrives
      {inputFn: () => [makeSimpleModel(sequenceTest.getVariable(meCount), 2, sequenceTest.getVariable(meCount), 2), 2], output: {[send]: true}}
    ];

    sequenceTest.setChanges(onProxyMessage, storageProxyChanges);
    sequenceTest.setChanges(onReceive, driverChanges);

    sequenceTest.setEndInvariant(model, modelValue => {
      assert.deepEqual(modelValue, {model: makeSimpleModel(3, 2, 3, 2)});
    });
    sequenceTest.setEndInvariant(inSync, assert.isTrue);

    await sequenceTest.test();

  });

  it('applies operations to two stores connected by a volatile driver', async () => {
    const sequenceTest = new SequenceTest();
    sequenceTest.setTestConstructor(async () => {
      const runtime = new Runtime();
      DriverFactory.clearRegistrationsForTesting();
      VolatileStorageDriverProvider.register();
      const storageKey = new VolatileStorageKey('unique');
      const store1 = new Store<CRDTCountTypeRecord>(storageKey, Exists.ShouldCreate, null, StorageMode.Direct, CRDTCount);
      const activeStore1 = await store1.activate();
  
      const store2 = new Store<CRDTCountTypeRecord>(storageKey, Exists.ShouldExist, null, StorageMode.Direct, CRDTCount);
      const activeStore2 = await store2.activate();
      return {store1: activeStore1, store2: activeStore2};
    });

    const store1in = sequenceTest.registerInput('store1.onProxyMessage', 5, {type: ExpectedResponse.Constant, response: true});
    const store2in = sequenceTest.registerInput('store2.onProxyMessage', 5, {type: ExpectedResponse.Constant, response: true});

    const store1Model = sequenceTest.registerSensor('store1.localModel');
    const store2Model = sequenceTest.registerSensor('store2.localModel');
    const driverModel = sequenceTest.registerSensor('store1.driver.data.data');

    const store1changes = [
      {input: [incOp('me', 0)]},
      {input: [incOp('them', 0)]},
    ];
    const store2changes = [
      {input: [incOp('other', 0)]},
      {input: [incOp('other', 1)]},
    ];

    sequenceTest.setChanges(store1in, store1changes);
    sequenceTest.setChanges(store2in, store2changes);

    sequenceTest.setEndInvariant(store1Model, model => {
      assert.deepEqual(model.getData(), makeModel({'me': 1, 'them': 1, 'other': 2}, {'me': 1, 'them': 1, 'other': 2}));
    });

    sequenceTest.setEndInvariant(store2Model, model => {
      assert.deepEqual(model.getData(), makeModel({'me': 1, 'them': 1, 'other': 2}, {'me': 1, 'them': 1, 'other': 2}));
    });

    sequenceTest.setEndInvariant(driverModel, model => {
      assert.deepEqual(model, makeModel({'me': 1, 'them': 1, 'other': 2}, {'me': 1, 'them': 1, 'other': 2}));
    });

    await sequenceTest.test();
  });

  it('applies model against operations to two stores connected by a volatile driver', async () => {
    const sequenceTest = new SequenceTest();
    sequenceTest.setTestConstructor(async () => {
      const runtime = new Runtime();
      DriverFactory.clearRegistrationsForTesting();
      VolatileStorageDriverProvider.register();
      const storageKey = new VolatileStorageKey('unique');
      const store1 = new Store<CRDTCountTypeRecord>(storageKey, Exists.ShouldCreate, null, StorageMode.Direct, CRDTCount);
      const activeStore1 = await store1.activate();
  
      const store2 = new Store<CRDTCountTypeRecord>(storageKey, Exists.ShouldExist, null, StorageMode.Direct, CRDTCount);
      const activeStore2 = await store2.activate();
      return {store1: activeStore1, store2: activeStore2};
    });

    const store1in = sequenceTest.registerInput('store1.onProxyMessage', 5, {type: ExpectedResponse.Constant, response: true});
    const store2in = sequenceTest.registerInput('store2.onProxyMessage', 5, {type: ExpectedResponse.Constant, response: true});

    const store1Model = sequenceTest.registerSensor('store1.localModel');
    const store2Model = sequenceTest.registerSensor('store2.localModel');
    const driverModel = sequenceTest.registerSensor('store1.driver.data.data');

    const store1changes = [
      {input: [{type: ProxyMessageType.ModelUpdate, model: makeModel({'me': 42}, {'me': 12})}]},
      {input: [incOp('them', 0)]}
    ];
    const store2changes = [
      {input: [incOp('other', 0)]},
      {input: [incOp('other', 1)]},
    ];

    sequenceTest.setChanges(store1in, store1changes);
    sequenceTest.setChanges(store2in, store2changes);

    sequenceTest.setEndInvariant(store1Model, model => {
      assert.deepEqual(model.getData(), makeModel({'me': 42, 'them': 1, 'other': 2}, {'me': 12, 'them': 1, 'other': 2}));
    });

    sequenceTest.setEndInvariant(store2Model, model => {
      assert.deepEqual(model.getData(), makeModel({'me': 42, 'them': 1, 'other': 2}, {'me': 12, 'them': 1, 'other': 2}));
    });

    sequenceTest.setEndInvariant(driverModel, model => {
      assert.deepEqual(model, makeModel({'me': 42, 'them': 1, 'other': 2}, {'me': 12, 'them': 1, 'other': 2}));
    });

    await sequenceTest.test();
  });

});
