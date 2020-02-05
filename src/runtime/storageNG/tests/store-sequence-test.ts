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
import {Store, ActiveStore, ProxyMessageType, ProxyMessage} from '../store.js';
import {SequenceTest, ExpectedResponse, SequenceOutput} from '../../testing/sequence.js';
import {CRDTCountTypeRecord, CRDTCount, CountOpTypes, CountData} from '../../crdt/crdt-count.js';
import {DriverFactory} from '../drivers/driver-factory.js';
import {Exists} from '../drivers/driver.js';
import {StorageKey} from '../storage-key.js';
import {Runtime} from '../../runtime.js';
import {VolatileStorageKey, VolatileStorageDriverProvider} from '../drivers/volatile.js';
import {Dictionary} from '../../hot.js';
import {MockFirebaseStorageDriverProvider} from '../testing/mock-firebase.js';
import {FirebaseStorageKey} from '../drivers/firebase.js';
import {MockStorageKey, MockStorageDriverProvider} from '../testing/test-storage.js';
import {CountType} from '../../type.js';

let testKey: StorageKey;

function createStore(storageKey: StorageKey, exists: Exists): Store<CRDTCountTypeRecord> {
  return new Store({storageKey, exists, type: new CountType(), id: 'an-id'});
}

const incOp = (actor: string, from: number): ProxyMessage<CRDTCountTypeRecord> => (
  {
    type: ProxyMessageType.Operations,
    operations: [{type: CountOpTypes.Increment, actor, version: {from, to: from + 1}}],
    id: 1
  });

const makeSimpleModel = (meCount: number, themCount: number, meVersion: number, themVersion: number): CountData =>
  ({values: {me: meCount, them: themCount}, version: {me: meVersion, them: themVersion}});

function cloneDict<V>(inDict: Dictionary<V>): Dictionary<V> {
  const result = {};
  for (const [k, v] of Object.entries(inDict)) {
    result[k] = v;
  }
  return result;
}

const makeModel = (countDict: Dictionary<number>, versionDict: Dictionary<number>): CountData =>
  ({values: cloneDict(countDict), version: cloneDict(versionDict)});

describe('Store Sequence', async () => {

  before(() => {testKey = new MockStorageKey();});

  // Tests a model resync request happening synchronously with model updates from the driver
  it('services a model request and applies 2 models', async () => {
    const sequenceTest = new SequenceTest<ActiveStore<CRDTCountTypeRecord>>();
    sequenceTest.setTestConstructor(async () => {
      DriverFactory.clearRegistrationsForTesting();
      DriverFactory.register(new MockStorageDriverProvider());

      const store = createStore(testKey, Exists.ShouldCreate);
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
            assert.strictEqual(value.type, ProxyMessageType.ModelUpdate);
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

  // Tests 3 operation updates happening synchronously with 2 model updates from the driver
  it('applies 3 operations and 2 models simultaneously', async function() {
    this.timeout(40000);

    const sequenceTest = new SequenceTest<ActiveStore<CRDTCountTypeRecord>>();
    sequenceTest.setTestConstructor(async () => {
      DriverFactory.clearRegistrationsForTesting();
      DriverFactory.register(new MockStorageDriverProvider());

      const store = createStore(testKey, Exists.ShouldCreate);
      const activeStore = store.activate();
      return activeStore;
    });

    const onProxyMessage = sequenceTest.registerInput('onProxyMessage', 4, {type: ExpectedResponse.Constant, response: true});
    const onReceive = sequenceTest.registerInput('onReceive', 3, {type: ExpectedResponse.Void});

    const meCount = sequenceTest.registerVariable(0);

    const send = sequenceTest.registerOutput('driver.send',
      {
        type: ExpectedResponse.Defer,
        default: true,
        onOutput: (model => {
          if (sequenceTest.getOutput(send)) {
            sequenceTest.setVariable(meCount, model.values['me']);
          }
        })
      }, SequenceOutput.Replace);

    const model = sequenceTest.registerSensor('localModel');

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

    sequenceTest.setEndInvariant(model, async modelValue => {
      await sequenceTest.testObject().idle();
      assert.deepEqual(modelValue, {model: makeSimpleModel(3, 2, 3, 2)});
    });

    await sequenceTest.test();

  });

  it('applies operations to two stores connected by a volatile driver', async () => {
    const sequenceTest = new SequenceTest<{store1: ActiveStore<CRDTCountTypeRecord>, store2: ActiveStore<CRDTCountTypeRecord>}>();
    sequenceTest.setTestConstructor(async () => {
      const runtime = Runtime.newForNodeTesting();
      const arc = runtime.newArc('arc', null); //, 'volatile://');
      DriverFactory.clearRegistrationsForTesting();
      VolatileStorageDriverProvider.register(arc);
      const storageKey = new VolatileStorageKey(arc.id, 'unique');
      const store1 = createStore(storageKey, Exists.ShouldCreate);
      const activeStore1 = await store1.activate();

      const store2 = createStore(storageKey, Exists.ShouldExist);
      const activeStore2 = await store2.activate();
      return {store1: activeStore1, store2: activeStore2};
    });

    const store1in = sequenceTest.registerInput('store1.onProxyMessage', 5, {type: ExpectedResponse.Constant, response: true});
    const store2in = sequenceTest.registerInput('store2.onProxyMessage', 5, {type: ExpectedResponse.Constant, response: true});

    const store1Model = sequenceTest.registerSensor('store1.localModel');
    const store2Model = sequenceTest.registerSensor('store2.localModel');
    const driverModel = sequenceTest.registerSensor('store1.driver.data.root.data');

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

    sequenceTest.setEndInvariant(store1Model, async model => {
      await sequenceTest.testObject().store1.idle();
      await sequenceTest.testObject().store2.idle();
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

  it('applies operations to two stores connected by a firebase driver', async function() {
    this.timeout(40000);

    const sequenceTest = new SequenceTest();
    sequenceTest.setTestConstructor(async () => {
      const runtime = new Runtime();
      DriverFactory.clearRegistrationsForTesting();
      MockFirebaseStorageDriverProvider.register(runtime.getCacheService());
      const storageKey = new FirebaseStorageKey('test', 'test.domain', 'testKey', 'foo');
      const store1 = createStore(storageKey, Exists.ShouldCreate);
      const activeStore1 = await store1.activate();

      const store2 = createStore(storageKey, Exists.ShouldExist);
      const activeStore2 = await store2.activate();
      sequenceTest.setVariable(store1V, activeStore1);
      sequenceTest.setVariable(store2V, activeStore2);
      return {store1: activeStore1, store2: activeStore2};
    });

    const store1in = sequenceTest.registerInput('store1.onProxyMessage', 19, {type: ExpectedResponse.Constant, response: true});
    const store2in = sequenceTest.registerInput('store2.onProxyMessage', 19, {type: ExpectedResponse.Constant, response: true});

    const store1Model = sequenceTest.registerSensor('store1.localModel');
    const store2Model = sequenceTest.registerSensor('store2.localModel');

    const store1V = sequenceTest.registerVariable('store1');
    const store2V = sequenceTest.registerVariable('store2');

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

    sequenceTest.setEndInvariant(store1Model, async model => {
      await sequenceTest.getVariable(store1V).idle();
      await sequenceTest.getVariable(store2V).idle();
      assert.deepEqual(model.getData(), makeModel({'me': 1, 'them': 1, 'other': 2}, {'me': 1, 'them': 1, 'other': 2}));
    });

    sequenceTest.setEndInvariant(store2Model, model => {
      assert.deepEqual(model.getData(), makeModel({'me': 1, 'them': 1, 'other': 2}, {'me': 1, 'them': 1, 'other': 2}));
    });

    await sequenceTest.test();
  });

  // TODO(cypher1): Disabled temporarily, breaking on master.
  it.skip('applies model against operations to two stores connected by a volatile driver', async () => {
    const sequenceTest = new SequenceTest();
    sequenceTest.setTestConstructor(async () => {
      const runtime = Runtime.newForNodeTesting();
      const arc = runtime.newArc('arc', 'volatile://');
      DriverFactory.clearRegistrationsForTesting();
      VolatileStorageDriverProvider.register(arc);
      const storageKey = new VolatileStorageKey(arc.id, 'unique');
      const store1 = createStore(storageKey, Exists.ShouldCreate);
      const activeStore1 = await store1.activate();

      const store2 = createStore(storageKey, Exists.ShouldExist);
      const activeStore2 = await store2.activate();
      return {store1: activeStore1, store2: activeStore2};
    });

    const store1in = sequenceTest.registerInput('store1.onProxyMessage', 5, {type: ExpectedResponse.Constant, response: true});
    const store2in = sequenceTest.registerInput('store2.onProxyMessage', 5, {type: ExpectedResponse.Constant, response: true});

    const store1Model = sequenceTest.registerSensor('store1.localModel');
    const store2Model = sequenceTest.registerSensor('store2.localModel');
    const driverModel = sequenceTest.registerSensor('store1.driver.data.root.data');

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
