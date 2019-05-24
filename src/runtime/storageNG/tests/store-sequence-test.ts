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

class MockDriver<Data> extends Driver<Data> {
  receiver: ReceiveMethod<Data>;
  async read(key: string) { throw new Error('unimplemented'); }
  async write(key: string, value: {}) { throw new Error('unimplemented'); }
  registerReceiver(receiver: ReceiveMethod<Data>) {
    this.receiver = receiver;
  }
  async send(model: Data): Promise<boolean> {
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

describe('Store Flow', async () => {
  // Tests a model resync request happening synchronously with model updates from the driver
  it('services a model request and applies 2 models', async () => {
    const sequenceTest = new SequenceTest<ActiveStore<CRDTCountTypeRecord>>();
    sequenceTest.setTestConstructor(() => {
      DriverFactory.clearRegistrationsForTesting();
      DriverFactory.register(new MockStorageDriverProvider());
    
      const store = new Store('string', Exists.ShouldCreate, null, StorageMode.Direct, CRDTCount);
      const activeStore = store.activate();
      return activeStore;
    });    

    const onProxyMessage = sequenceTest.registerInput('onProxyMessage', 1, 
      {type: ExpectedResponse.Constant, response: true});
    const onReceive = sequenceTest.registerInput('onReceive', 1, {type: ExpectedResponse.Void}); 

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
      
    const storageProxyChanges: {inputFn: () => ProxyMessage<CRDTCountTypeRecord>, variable: {}}[] 
      = [{inputFn: () => ({type: ProxyMessageType.SyncRequest, id: sequenceTest.getVariable(idVar)}), 
          variable: {[isSyncRequest]: true}}]; 

    const makeModel = (meCount: number, themCount: number, meVersion: number, themVersion: number): CountData => 
        ({values: new Map([['me', meCount], ['them', themCount]]), 
          version: new Map([['me', meVersion], ['them', themVersion]])});
    const driverChanges = [
      {output: {[send]: false}},
      {input: makeModel(7, 12, 3, 4), output: {[send]: true}},
      {output: {[send]: false}},
      {input: makeModel(8, 12, 4, 4), output: {[send]: true}}
    ];

    sequenceTest.setChanges(onProxyMessage, storageProxyChanges);
    sequenceTest.setChanges(onReceive, driverChanges);

    sequenceTest.test();
  });

  // Tests 3 operation updates happening synchronously with 2 model updates from the driver 
  it('applies 3 operations and 2 models simultaneously', async () => {
    const sequenceTest = new SequenceTest<ActiveStore<CRDTCountTypeRecord>>();
    sequenceTest.setTestConstructor(() => {
      DriverFactory.clearRegistrationsForTesting();
      DriverFactory.register(new MockStorageDriverProvider());
    
      const store = new Store('string', Exists.ShouldCreate, null, StorageMode.Direct, CRDTCount);
      const activeStore = store.activate();
      return activeStore;
    });    

    const onProxyMessage = sequenceTest.registerInput('onProxyMessage', 3, {type: ExpectedResponse.Constant, response: true});
    const onReceive = sequenceTest.registerInput('onReceive', 1, {type: ExpectedResponse.Void}); 

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


    const incOp = (actor: string, from: number): ProxyMessage<CRDTCountTypeRecord> => (
      {
        type: ProxyMessageType.Operations,
        operations: [{type: CountOpTypes.Increment, actor, version: {from, to: from + 1}}],
        id: 1
      });
    const storageProxyChanges = [{input: incOp('me', 0)}, {input: incOp('me', 1)}, {input: incOp('me', 2)}];

    const makeModel = (meCount: number, themCount: number, meVersion: number, themVersion: number): CountData => 
        ({values: new Map([['me', meCount], ['them', themCount]]), 
          version: new Map([['me', meVersion], ['them', themVersion]])});
    const driverChanges = [
      {output: {[send]: false}}, // at some point data arrives at the driver
      // the sendCount at driverChanges[0] is the inc count for ‘me’ 
      {inputFn: () => makeModel(sequenceTest.getVariable(meCount), 1, sequenceTest.getVariable(meCount), 1), output: {[send]: true}},
      {output: {[send]: false}}, // more data arrives
      {inputFn: () => makeModel(sequenceTest.getVariable(meCount), 2, sequenceTest.getVariable(meCount), 2), output: {[send]: true}}
    ];

    sequenceTest.setChanges(onProxyMessage, storageProxyChanges);
    sequenceTest.setChanges(onReceive, driverChanges);

    sequenceTest.setEndInvariant(model, modelValue => {
      assert.deepEqual(modelValue, {model: makeModel(3, 2, 3, 2)});
    });
    sequenceTest.setEndInvariant(inSync, assert.isTrue);

    sequenceTest.test();

  });

});
