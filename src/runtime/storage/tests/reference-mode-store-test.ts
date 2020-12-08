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
import {Runtime} from '../../runtime.js';
import {ProxyMessageType} from '../store-interface.js';
import {DriverFactory} from '../drivers/driver-factory.js';
import {Exists} from '../drivers/driver.js';
import {DirectStore} from '../direct-store.js';
import {MockStorageDriverProvider, MockDriver, MockHierarchicalStorageKey} from '../testing/test-storage.js';
import {ReferenceModeStore, ReferenceCollection, Reference} from '../reference-mode-store.js';
import {CountType, CollectionType, EntityType, SingletonType, Schema} from '../../../types/lib-types.js';
import {SerializedEntity} from '../../entity.js';
import {ReferenceModeStorageKey} from '../reference-mode-storage-key.js';
import {CRDTEntity, EntityOpTypes, CRDTEntityTypeRecord, CRDTCollection, CollectionOpTypes, CollectionData,
        CollectionOperation, CRDTSingleton} from '../../../crdt/lib-crdt.js';
import {StoreInfo} from '../store-info.js';
import {CollectionEntityType} from '../storage.js';
import {StorageEndpointManager} from '../storage-manager.js';
import {DirectStorageEndpointManager} from '../direct-storage-endpoint-manager.js';

/* eslint-disable no-async-promise-executor */

let testKey: ReferenceModeStorageKey;
let storeInfo: StoreInfo<CollectionEntityType>;
let storageManager: StorageEndpointManager;

class MyEntityModel extends CRDTEntity<{name: {id: string, value: string}, age: {id: string, value: number}}, {}> {
  constructor() {
    super({name: new CRDTSingleton<{id: string, value: string}>(), age: new CRDTSingleton<{id: string, value: number}>()}, {});
  }
}

class MyEntity {
  id: string;
  creationTimestamp: number;
  rawData: {
    name?: string;
    age?: number;
  } = {};
}

const now = new Date().getTime();

class MyEntityCollection extends CRDTCollection<SerializedEntity> {}

const schema = new Schema(['Thing'], {name: 'Text', age: 'Number'});
const collectionType = new CollectionType(new EntityType(schema));

async function createReferenceModeStore() {
  return ReferenceModeStore.construct({
    storageKey: testKey,
    exists: Exists.ShouldCreate,
    type: collectionType,
    storeInfo
  });
}

// Load the model from the backing store and convert it to an entity.
function loadEntityFromBackingStore(activeStore, id: string): SerializedEntity {
  return activeStore['entityFromModel'](activeStore.backingStore.getLocalModel(id, 1).getData(), id);
}

function myEntityToMyEntityModel(entity: MyEntity, actor: string): MyEntityModel {
  const crdtEntity = new MyEntityModel();
  const version = {[actor]: 1};
  for (const key of Object.keys(entity.rawData)) {
    crdtEntity.model.singletons[key].collection.model.values[entity.rawData[key].toString()] = {
      value: {
        id: entity.rawData[key].toString(),
        value: entity.rawData[key]
      },
      version
    };
    crdtEntity.model.singletons[key].collection.model.version = version;
  }
  crdtEntity.model.version = version;
  return crdtEntity;
}

describe('Reference Mode Store', async () => {

  beforeEach(() => {
    testKey = new ReferenceModeStorageKey(new MockHierarchicalStorageKey(), new MockHierarchicalStorageKey());
    storeInfo = new StoreInfo({
        storageKey: testKey, type: collectionType, exists: Exists.ShouldCreate, id: 'base-store-id'});
    Runtime.resetDrivers();
    storageManager = new DirectStorageEndpointManager();
  });

  after(() => {
    Runtime.resetDrivers();
  });

  it(`will throw an exception if an appropriate driver can't be found`, async () => {
    const type = new SingletonType(new CountType());
    try {
      await storageManager.getActiveStore(new StoreInfo({
          storageKey: testKey, type, exists: Exists.ShouldCreate, id: 'an-id'}));
      assert.fail('store.activate() should not have succeeded');
    } catch (e) {
      assert.match(e.toString(), /No driver exists/);
    }
  });

  it('will construct ReferenceMode stores when required', async () => {
    DriverFactory.register(new MockStorageDriverProvider());

    const type = new SingletonType(new CountType());
    const activeStore = await storageManager.getActiveStore((new StoreInfo({
        storageKey: testKey, type, exists: Exists.ShouldCreate, id: 'an-id'})));
    assert.equal(activeStore.constructor, ReferenceModeStore);
  });

  it('will propagate model updates from proxies to drivers', async () => {
    DriverFactory.register(new MockStorageDriverProvider());

    const activeStore = await createReferenceModeStore();

    const driver = activeStore.containerStore['driver'] as MockDriver<CollectionData<Reference>>;
    let capturedModel: CollectionData<Reference> = null;
    driver.send = async model => {capturedModel = model; return true;};

    const collection = new MyEntityCollection();
    const entity = new MyEntity();
    entity.rawData.age = 42;
    entity.id = 'an-id';
    entity.creationTimestamp = now;
    entity.rawData.name = 'bob';
    collection.applyOperation({type: CollectionOpTypes.Add, versionMap: {me: 1}, actor: 'me', added: entity});

     await activeStore.onProxyMessage({type: ProxyMessageType.ModelUpdate, model: collection.getData(), id: 1});

    const actor = activeStore['crdtKey'];
    const referenceCollection = new ReferenceCollection();
    const reference: Reference = {storageKey: new MockHierarchicalStorageKey(''), id: 'an-id', version: {[actor]: 1}};
    referenceCollection.applyOperation({type: CollectionOpTypes.Add, versionMap: {me: 1}, actor: 'me', added: reference});

    const entityCRDT = myEntityToMyEntityModel(entity, actor);

    assert.deepEqual(capturedModel, referenceCollection.getData());
    const storedEntity = activeStore.backingStore.getLocalModel('an-id', 1);
    assert.deepEqual(storedEntity.getData(), entityCRDT.getData());
  });

  it('can clone data from another store', async () => {
    DriverFactory.register(new MockStorageDriverProvider());

    const activeStore = await createReferenceModeStore();

    // Add some data.
    const collection = new MyEntityCollection();
    const entity = new MyEntity();
    entity.rawData.age = 42;
    entity.id = 'an-id';
    entity.creationTimestamp = now;
    entity.rawData.name = 'bob';
    collection.applyOperation({type: CollectionOpTypes.Add, versionMap: {me: 1}, actor: 'me', added: entity});
    const result = await activeStore.onProxyMessage({type: ProxyMessageType.ModelUpdate, model: collection.getData(), id: 1});

    // Clone.
    const activeStore2 = await createReferenceModeStore();
    await activeStore2.cloneFrom(activeStore);
    assert.deepEqual(await activeStore2.serializeContents(), await activeStore.serializeContents());
  });

  it('will apply and propagate operation updates from proxies to drivers', async () => {
    DriverFactory.register(new MockStorageDriverProvider());

    const activeStore = await createReferenceModeStore();

    const driver = activeStore.containerStore['driver'] as MockDriver<CollectionData<Reference>>;
    let capturedModel: CollectionData<Reference> = null;
    driver.send = async model => {capturedModel = model; return true;};

    const entity = new MyEntity();
    entity.rawData.age = 42;
    entity.id = 'an-id';
    entity.creationTimestamp = now;
    entity.rawData.name = 'bob';
    const operation: CollectionOperation<MyEntity> = {type: CollectionOpTypes.Add, versionMap: {me: 1}, actor: 'me', added: entity};

    await activeStore.onProxyMessage({type: ProxyMessageType.Operations, operations: [operation], id: 1});

    const actor = activeStore['crdtKey'];
    const referenceCollection = new ReferenceCollection();
    const reference: Reference = {storageKey: new MockHierarchicalStorageKey(''), id: 'an-id', version: {[actor]: 1}};
    referenceCollection.applyOperation({type: CollectionOpTypes.Add, versionMap: {me: 1}, actor: 'me', added: reference});

    const entityCRDT = myEntityToMyEntityModel(entity, actor);

    assert.deepEqual(capturedModel, referenceCollection.getData());
    const storedEntity = activeStore.backingStore.getLocalModel('an-id', 1);
    assert.deepEqual(storedEntity.getData(), entityCRDT.getData());
  });

  it('clear entity in the backing store when they are removed from a collection', async () => {
    DriverFactory.register(new MockStorageDriverProvider());

    const activeStore = await createReferenceModeStore();

    const entity = new MyEntity();
    entity.rawData.age = 42;
    entity.id = 'an-id';
    entity.rawData.name = 'bob';

    // Add Bob to a collection.
    const addOperation: CollectionOperation<MyEntity> = {
      type: CollectionOpTypes.Add,
      versionMap: {me: 1},
      actor: 'me',
      added: entity
    };
    await activeStore.onProxyMessage({type: ProxyMessageType.Operations, operations: [addOperation], id: 1});

    // After adding, there is a corresponding entity in the backing store.
    assert.deepEqual(loadEntityFromBackingStore(activeStore, 'an-id'), entity);

    // Now remove it from the collection.
    const deleteOp: CollectionOperation<MyEntity> = {
      type: CollectionOpTypes.Remove,
      versionMap: {me: 1},
      actor: 'me',
      removed: entity
    };
    await activeStore.onProxyMessage({type: ProxyMessageType.Operations, operations: [deleteOp], id: 1});

    // After removing, there corresponding entity in the backing store is now
    // blank.
    const storedEntity2 = loadEntityFromBackingStore(activeStore, 'an-id') as MyEntity;
    assert.equal(storedEntity2.id, 'an-id');
    assert.equal(storedEntity2.rawData.age, null);
    assert.equal(storedEntity2.rawData.name, null);
  });

  it('will respond to a model request from a proxy with a model', async () => {
    DriverFactory.register(new MockStorageDriverProvider());

    const activeStore = await createReferenceModeStore();

    const driver = activeStore.containerStore['driver'] as MockDriver<CollectionData<Reference>>;
    driver.send = async model => true;

    const collection = new MyEntityCollection();
    const entity = new MyEntity();
    entity.rawData.age = 42;
    entity.id = 'an-id';
    entity.rawData.name = 'bob';
    const operation: CollectionOperation<MyEntity> = {type: CollectionOpTypes.Add, versionMap: {me: 1}, actor: 'me', added: entity};
    collection.applyOperation(operation);

    let sentSyncRequest = false;

    return new Promise<boolean>(async (resolve, reject) => {
      const id = activeStore.on(async proxyMessage => {
        if (proxyMessage.type === ProxyMessageType.Operations) {
          assert.isFalse(sentSyncRequest);
          sentSyncRequest = true;
          await activeStore.onProxyMessage({type: ProxyMessageType.SyncRequest, id});
          return;
        }
        assert.isTrue(sentSyncRequest);
        if (proxyMessage.type === ProxyMessageType.ModelUpdate) {
          assert.deepEqual(proxyMessage.model, collection.getData());
          resolve(true);
          return;
        }
        reject(new Error());
      });

      await activeStore.onProxyMessage({type: ProxyMessageType.Operations, operations: [operation], id: id + 1});
    });
  });

  it('will only send a model response to the requesting proxy', async () => {
    DriverFactory.register(new MockStorageDriverProvider());

    const activeStore = await createReferenceModeStore();

    return new Promise<boolean>(async (resolve, reject) => {
      // requesting store
      const id1 = activeStore.on(async proxyMessage => {
        assert.equal(proxyMessage.type, ProxyMessageType.ModelUpdate);
        resolve(true);
      });

      // another store
      const id2 = activeStore.on(proxyMessage => {
        throw new Error();
      });

      await activeStore.onProxyMessage({type: ProxyMessageType.SyncRequest, id: id1});
    });
  });

  it('will propagate updates from drivers to proxies', async () => {
    DriverFactory.register(new MockStorageDriverProvider());

    const activeStore = await createReferenceModeStore();

    const collection = new MyEntityCollection();
    const entity = new MyEntity();
    entity.rawData.age = 42;
    entity.id = 'an-id';
    entity.rawData.name = 'bob';
    collection.applyOperation({type: CollectionOpTypes.Add, versionMap: {me: 1}, actor: 'me', added: entity});

    const referenceCollection = new ReferenceCollection();
    const reference: Reference = {storageKey: new MockHierarchicalStorageKey(''), id: 'an-id', version: {me: 1}};
    referenceCollection.applyOperation({type: CollectionOpTypes.Add, versionMap: {me: 1}, actor: 'me', added: reference});

    const actor = activeStore['crdtKey'];
    const entityCRDT = myEntityToMyEntityModel(entity, actor);

    await activeStore.backingStore.onProxyMessage({type: ProxyMessageType.ModelUpdate, model: entityCRDT.getData(), id: 1, muxId: 'an-id'});

    return new Promise<boolean>(async (resolve, reject) => {
      const id = activeStore.on(async proxyMessage => {
        if (proxyMessage.type === ProxyMessageType.ModelUpdate) {
          assert.equal(proxyMessage.id, id);
          assert.deepEqual(proxyMessage.model, collection.getData());
          resolve(true);
          return;
        }
        throw new Error();
      });

      const driver = activeStore.containerStore['driver'] as MockDriver<CollectionData<Reference>>;
      await driver.receiver(referenceCollection.getData(), 1);
    });
  });

  // TODO: this test can be enabled when we output operations from collection model merges
  it.skip(`won't send an update to the driver after driver-originated messages`, async () => {
    DriverFactory.register(new MockStorageDriverProvider());

    const activeStore = await createReferenceModeStore();

    const referenceCollection = new ReferenceCollection();
    const reference: Reference = {storageKey: new MockHierarchicalStorageKey(''), id: 'an-id', version: {me: 1}};
    referenceCollection.applyOperation({type: CollectionOpTypes.Add, versionMap: {me: 1}, actor: 'me', added: reference});

    const driver = activeStore.containerStore['driver'] as MockDriver<CollectionData<Reference>>;
    driver.send = async model => {throw new Error('Should not be invoked');};

    // Note that this assumes no asynchrony inside store.ts. This is guarded by the following
    // test, which will fail if driver.receiver() doesn't synchronously invoke driver.send().
    await driver.receiver(referenceCollection.getData(), 1);
  });

  it('will resend failed driver updates after merging', async () => {
    DriverFactory.register(new MockStorageDriverProvider());

    const activeStore = await createReferenceModeStore();

    // local model from proxy
    const collection = new MyEntityCollection();
    const entity = new MyEntity();
    entity.rawData.age = 42;
    entity.id = 'an-id';
    entity.creationTimestamp = now;
    entity.rawData.name = 'bob';
    collection.applyOperation({type: CollectionOpTypes.Add, versionMap: {me: 1}, actor: 'me', added: entity});

    // conflicting remote count from store
    const remoteCollection = new ReferenceCollection();
    const reference: Reference = {storageKey: new MockHierarchicalStorageKey(''), id: 'another-id', version: {them: 1}};
    remoteCollection.applyOperation({type: CollectionOpTypes.Add, versionMap: {them: 1}, actor: 'them', added: reference});

    // ensure remote entity is stored in backing store
    const id2 = activeStore.backingStore.on(msg => null);
    await activeStore.backingStore.onProxyMessage({type: ProxyMessageType.ModelUpdate, model: {singletons: {name: {values: {}, version: {}}, age: {values: {}, version: {}}}, collections: {}, version: {}}, id: id2, muxId: 'another-id'});

    const driver = activeStore.containerStore['driver'] as MockDriver<CollectionData<Reference>>;
    let sendInvoked = false;
    driver.send = async model => {sendInvoked = true; return false;};

    await activeStore.onProxyMessage({type: ProxyMessageType.ModelUpdate, model: collection.getData(), id: 1});
    assert.isTrue(sendInvoked);

    sendInvoked = false;
    let capturedModel: CollectionData<Reference> = null;
    driver.send = async model => {sendInvoked = true; capturedModel = model; return true;};

    await driver.receiver(remoteCollection.getData(), 1);
    assert.isTrue(sendInvoked);

    const actor = activeStore['crdtKey'];
    const reference2: Reference = {storageKey: new MockHierarchicalStorageKey(''), id: 'an-id', version: {[actor]: 1}};
    remoteCollection.applyOperation({type: CollectionOpTypes.Add, versionMap: {me: 1}, actor: 'me', added: reference2});
    assert.deepEqual(capturedModel, remoteCollection.getData());
  });

  it('resolves a combination of messages from the proxy and the driver', async () => {
    DriverFactory.register(new MockStorageDriverProvider());

    const activeStore = await createReferenceModeStore();

    const driver = activeStore.containerStore['driver'] as MockDriver<CollectionData<Reference>>;
    let lastModel = null;
    driver.send = async model => {lastModel = model; return true;};

    const e1 = new MyEntity();
    e1.id = 'e1';
    e1.creationTimestamp = now;
    const e2 = new MyEntity();
    e2.id = 'e2';
    e2.creationTimestamp = now;
    const e3 = new MyEntity();
    e3.id = 'e3';
    e3.creationTimestamp = now;

    await activeStore.onProxyMessage({type: ProxyMessageType.Operations, id: 1, operations: [
      {type: CollectionOpTypes.Add, actor: 'me', versionMap: {me: 1}, added: e1}
    ]});
    await activeStore.onProxyMessage({type: ProxyMessageType.Operations, id: 1, operations: [
      {type: CollectionOpTypes.Add, actor: 'me', versionMap: {me: 2}, added: e2}
    ]});
    await activeStore.onProxyMessage({type: ProxyMessageType.Operations, id: 1, operations: [
      {type: CollectionOpTypes.Add, actor: 'me', versionMap: {me: 3}, added: e3}
    ]});

    const e1V = {value: {id: 'e1', storageKey: new MockHierarchicalStorageKey(''), version: {}}, version: {me: 1}};
    const t1V = {value: {id: 't1', storageKey: new MockHierarchicalStorageKey(''), version: {}}, version: {me: 1, them: 1}};
    const t2V = {value: {id: 't2', storageKey: new MockHierarchicalStorageKey(''), version: {}}, version: {me: 1, them: 2}};

    driver.receiver({values: {e1: e1V, t1: t1V}, version: {me: 1, them: 1}}, 1);
    driver.receiver({values: {e1: e1V, t1: t1V, t2: t2V}, version: {me: 1, them: 2}}, 2);

    await activeStore.idle();

    assert.deepEqual(activeStore.containerStore['localModel']['model'], lastModel);
  });

  it('holds onto a container update until the relevant backing data arrives', async () => {
    DriverFactory.register(new MockStorageDriverProvider());

    const activeStore = await createReferenceModeStore();

    const actor = activeStore['crdtKey'];

    const referenceCollection = new ReferenceCollection();
    const reference: Reference = {storageKey: new MockHierarchicalStorageKey(''), id: 'an-id', version: {[actor]: 1}};
    referenceCollection.applyOperation({type: CollectionOpTypes.Add, versionMap: {me: 1}, actor: 'me', added: reference});

    return new Promise(async (resolve, reject) => {
      let backingStoreSent = false;
      activeStore.on(async message => {
        if (!backingStoreSent) {
          reject(new Error());
          return;
        }
        const entityRecord = message['model'].values['an-id'].value;
        assert.equal(entityRecord.rawData.name, 'bob');
        assert.equal(entityRecord.rawData.age, 42);
        resolve();
      });

      await activeStore.containerStore.onReceive(referenceCollection.getData(), 1);
      backingStoreSent = true;
      assert(activeStore.backingStore['stores']['an-id'].type === 'pending');
      await activeStore.backingStore['stores']['an-id']['promise'];
      const store = activeStore.backingStore['stores']['an-id']['store'] as DirectStore<CRDTEntityTypeRecord<{name: {id: string}, age: {id: string, value: number}}, {}>>;

      const entityCRDT = new MyEntityModel();
      entityCRDT.applyOperation({type: EntityOpTypes.Set, field: 'age', value: {id: '42', value: 42}, actor, versionMap: {[actor]: 1}});
      entityCRDT.applyOperation({type: EntityOpTypes.Set, field: 'name', value: {id: 'bob', value: 'bob'}, actor, versionMap: {[actor]: 2}});

      await store.onReceive(entityCRDT.getData(), 1);
    });


  });
});
