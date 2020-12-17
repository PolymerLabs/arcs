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
import {Loader} from '../../../platform/loader.js';
import {IdGenerator} from '../../id.js';
import {Particle} from '../../particle.js';
import {CollectionType, EntityType, SingletonType, Type, ReferenceType, Schema, MuxType} from '../../../types/lib-types.js';
import {CollectionHandle, SingletonHandle, EntityHandle} from '../handle.js';
import {StorageProxy} from '../storage-proxy.js';
import {ProxyMessageType} from '../store-interface.js';
import {MockParticle, MockStore} from '../testing/test-storage.js';
import {Manifest} from '../../manifest.js';
import {EntityClass, Entity, SerializedEntity} from '../../entity.js';
import {SYMBOL_INTERNALS} from '../../symbols.js';
import {CRDTEntityCollection, ActiveCollectionEntityStore, CollectionEntityType, CRDTEntitySingleton, CRDTMuxEntity} from '../storage.js';
import {Reference} from '../../reference.js';
import {VersionMap, CollectionOperation, CollectionOpTypes, CRDTCollectionTypeRecord,
        CRDTCollection, CRDTSingletonTypeRecord, SingletonOperation, SingletonOpTypes, CRDTSingleton,
        CRDTEntityTypeRecord, Identified, CRDTEntity, EntityOpTypes} from '../../../crdt/lib-crdt.js';
import {StoreInfo} from '../store-info.js';


async function getCollectionHandle(primitiveType: EntityType, particle?: MockParticle, canRead=true, canWrite=true):
    Promise<CollectionHandle<Entity>> {
  const fakeParticle: Particle = (particle || new MockParticle()) as unknown as Particle;
  const mockStore = new MockStore<CRDTEntityCollection>(new CollectionType(primitiveType));
  const handle = new CollectionHandle(
      'me',
      new StorageProxy('id', mockStore.storeInfo, mockStore),
      IdGenerator.newSession(),
      fakeParticle,
      canRead,
      canWrite) as unknown as CollectionHandle<Entity>;
  // Initialize the model.
  await handle.storageProxy.onMessage({
    type: ProxyMessageType.ModelUpdate,
    model: {values: {}, version: {}},
    id: 1
  });
  return handle;
}

async function getSingletonHandle(primitiveType: EntityType, particle?: MockParticle, canRead=true, canWrite=true):
    Promise<SingletonHandle<Entity>> {
  const fakeParticle: Particle = (particle || new MockParticle()) as unknown as Particle;
  const mockStore = new MockStore<CRDTEntitySingleton>(new SingletonType(primitiveType));
  const handle = new SingletonHandle(
      'me',
      new StorageProxy('id', mockStore.storeInfo, mockStore),
      IdGenerator.newSession(),
      fakeParticle,
      canRead,
      canWrite) as unknown as  SingletonHandle<Entity>;
  // Initialize the model.
  await handle.storageProxy.onMessage({
    type: ProxyMessageType.ModelUpdate,
    model: {values: {}, version: {}},
    id: 1
  });
  return handle;
}

async function getEntityHandle(schema: Schema, muxId: string, particle?: MockParticle, canRead=true, canWrite=true):
    Promise<EntityHandle<Entity>> {
  const fakeParticle: Particle = (particle || new MockParticle()) as unknown as Particle;
  const mockStore = new MockStore<CRDTMuxEntity>(new MuxType<EntityType>(new EntityType(schema)));
  const storageProxy = new StorageProxy('id', mockStore.storeInfo, mockStore);
  const handle = new EntityHandle<Entity>(
    'me',
    storageProxy,
    IdGenerator.newSession(),
    fakeParticle,
    canRead,
    canWrite,
    muxId);
  return handle;
}

let barType: EntityType;
// tslint:disable-next-line variable-name
let Bar: EntityClass;

function newEntity(id: string) {
  const bar = new Bar({});
  Entity.identify(bar, id, null);
  return bar;
}

async function containedIds(handle: CollectionHandle<Entity>): Promise<string[]> {
  return (await handle.toList()).map(a => Entity.id(a));
}
const creationTimestamp = new Date().getTime();

describe('CollectionHandle', async () => {
  before(async () => {
    const loader = new Loader();
    const manifest = await Manifest.load('./src/runtime/tests/artifacts/test-particles.manifest', loader);
    barType = new EntityType(manifest.schemas.Bar);
    Bar = Entity.createEntityClass(barType.getEntitySchema(), null);
  });

  it('can add and remove elements', async () => {
    const handle = await getCollectionHandle(barType);
    assert.isEmpty(handle.toList());

    await handle.add(newEntity('A'));
    assert.sameDeepMembers(await containedIds(handle), ['A']);
    await handle.add(newEntity('B'));
    assert.sameDeepMembers(await containedIds(handle), ['A', 'B']);
    await handle.remove(newEntity('A'));
    assert.sameDeepMembers(await containedIds(handle), ['B']);
  });

  it('respects canWrite', async () => {
    const handle = await getCollectionHandle(barType, new MockParticle(), true, false);
    try {
      await handle.add(newEntity('A'));
      assert.fail('handle.add should not have succeeded');
    } catch (e) {
      assert.match(e.toString(), /Error: Handle not writeable/);
    }
    try {
      await handle.clear();
      assert.fail('handle.clear should not have succeeded');
    } catch (e) {
      assert.match(e.toString(), /Error: Handle not writeable/);
    }
    try {
      await handle.remove(newEntity('A'));
      assert.fail('handle.remove should not have succeeded');
    } catch (e) {
      assert.match(e.toString(), /Error: Handle not writeable/);
    }
  });

  it('respects canRead', async () => {
    const handle = await getCollectionHandle(barType, new MockParticle(), false, true);
    try {
      await handle.fetch('A');
      assert.fail('handle.fetch should not have succeeded');
    } catch (e) {
      assert.match(e.toString(), /Error: Handle not readable/);
    }
    try {
      await handle.toList();
      assert.fail('handle.toList should not have succeeded');
    } catch (e) {
      assert.match(e.toString(), /Error: Handle not readable/);
    }
  });

  it('can get an element by ID', async () => {
    const handle = await getCollectionHandle(barType);
    const entity = newEntity('A');
    Entity.mutate(entity, {value: 'something'});
    await handle.add(entity);
    await handle.add(newEntity('B'));
    assert.deepEqual(await handle.fetch('A'), entity);
  });

  it('assigns IDs to entities with missing IDs', async () => {
    const handle = await getCollectionHandle(barType);
    const entity = new handle.entityClass({});
    assert.isFalse(Entity.isIdentified(entity));
    // TODO: Fails here! entity.id is not the right way of accessing the
    // entity's ID, but that is what the CRDT expects. Do we need to serialize
    // it first?
    await handle.add(entity);
    assert.isTrue(Entity.isIdentified(entity));
  });

  it('can clear', async () => {
    const handle = await getCollectionHandle(barType);
    await handle.add(newEntity('A'));
    await handle.add(newEntity('B'));
    await handle.clear();
    assert.isEmpty(handle.toList());
  });

  it('can add multiple entities', async () => {
    const handle = await getCollectionHandle(barType);
    await handle.addMultiple([newEntity('A'), newEntity('B')]);
    assert.sameDeepMembers(await containedIds(handle), ['A', 'B']);
  });

  it('notifies particle on sync event', async () => {
    const particle: MockParticle = new MockParticle();
    const handle = await getCollectionHandle(barType, particle);
    await handle.onSync(new Set());
    assert.isTrue(particle.onSyncCalled);
  });

  it('notifies particle on desync event', async () => {
    const particle: MockParticle = new MockParticle();
    const handle = await getCollectionHandle(barType, particle);
    await handle.onDesync();
    assert.isTrue(particle.onDesyncCalled);
  });

  it('notifies particle of updates', async () => {
    const particle: MockParticle = new MockParticle();
    const handle = await getCollectionHandle(barType, particle);
    const op: CollectionOperation<SerializedEntity> = {
      type: CollectionOpTypes.Remove,
      removed: {id: 'id', creationTimestamp, rawData: {}},
      actor: 'actor',
      versionMap: {'actor': 1}
    };
    await handle.onUpdate(op);
    assert.equal(Entity.id(particle.lastUpdate.removed[0]), 'id');
    assert.isFalse(particle.lastUpdate.originator);
  });

  it('notifies particle of fast forward ops', async () => {
    const particle: MockParticle = new MockParticle();
    const handle = await getCollectionHandle(barType, particle);
    const op: CollectionOperation<SerializedEntity> = {
      type: CollectionOpTypes.FastForward,
      added: [],
      removed: [{id: 'id', creationTimestamp, rawData: {}}],
      oldVersionMap: {'actor': 1},
      newVersionMap: {'actor': 1}
    };
    await handle.onUpdate(op);
    assert.isTrue(particle.onSyncCalled);
  });

  it('uses the storage proxy versionMap', async () => {
    const handle = await getCollectionHandle(barType);

    const versionMap: VersionMap = {'actor': 1, 'other': 2};
    // Set the storageProxy version map.
    await handle.storageProxy.onMessage({
      type: ProxyMessageType.ModelUpdate,
      model: {values: {}, version: versionMap},
      id: 1
    });

    // This will pull in the version map above.
    await handle.toList();
    // Swap out storageProxy.applyOp to check the updated versionMap is passed in the next op.
    let capturedVersionMap: VersionMap;
    handle.storageProxy.applyOp = async (op: CollectionOperation<{id: string}>) => {
      capturedVersionMap = 'versionMap' in op ? op.versionMap : null;
      return true;
    };
    // Use an op that does not increment the versionMap.
    await handle.remove(newEntity('id'));
    assert.deepEqual(capturedVersionMap, versionMap);
  });

  it('can override default options', async () => {
    const handle = await getCollectionHandle(barType);
    assert.deepEqual(handle.options, {
      keepSynced: true,
      notifySync: true,
      notifyUpdate: true,
      notifyDesync: false,
    });
    handle.configure({notifyDesync: true, notifySync: false});
    assert.deepEqual(handle.options, {
      keepSynced: true,
      notifySync: false,
      notifyUpdate: true,
      notifyDesync: true,
    });
  });

  it('can fetchAll', async () => {
    const handle = await getCollectionHandle(barType);
    const A = newEntity('A');
    const B = newEntity('B');
    await handle.addMultiple([A, B]);
    const s = await handle.fetchAll();
    assert.deepEqual(s, new Set([A, B]));
  });
});

describe('SingletonHandle', async () => {
  before(async () => {
    const loader = new Loader();
    const manifest = await Manifest.load('./src/runtime/tests/artifacts/test-particles.manifest', loader);
    barType = new EntityType(manifest.schemas.Bar);
    Bar = Entity.createEntityClass(barType.getEntitySchema(), null);
  });
  it('can set and clear elements', async () => {
    const handle = await getSingletonHandle(barType);
    assert.strictEqual(await handle.fetch(), null);
    await handle.set(newEntity('A'));
    assert.deepEqual(await handle.fetch(), newEntity('A'));
    await handle.set(newEntity('B'));
    assert.deepEqual(await handle.fetch(), newEntity('B'));
    await handle.clear();
    assert.strictEqual(await handle.fetch(), null);
  });

  it('notifies particle on sync event', async () => {
    const particle: MockParticle = new MockParticle();
    const handle = await getSingletonHandle(barType, particle);
    await handle.onSync(null);
    assert.isTrue(particle.onSyncCalled);
  });

  it('can clear value set by other actor', async () => {
    const handle = await getSingletonHandle(barType);
    await handle.set(newEntity('A'));
    // Simulate another writer overwriting the value.
    await handle.storageProxy.applyOp({
      type: SingletonOpTypes.Set,
      value: newEntity('B')[SYMBOL_INTERNALS].serialize(),
      actor: 'other',
      versionMap: {'other': 1},
    });
    await handle.clear();
    assert.strictEqual(await handle.fetch(), null);
  });

  it('notifies particle on desync event', async () => {
    const particle: MockParticle = new MockParticle();
    const handle = await getSingletonHandle(barType, particle);
    await handle.onDesync();
    assert.isTrue(particle.onDesyncCalled);
  });

  it('notifies particle of updates', async () => {
    const particle: MockParticle = new MockParticle();
    const handle = await getSingletonHandle(barType, particle);
    const op: SingletonOperation<SerializedEntity> = {
      type: SingletonOpTypes.Set,
      value: {id: 'id', creationTimestamp, rawData: {}},
      actor: 'actor',
      versionMap: {'actor': 1}
    };
    await handle.onUpdate(op);
    assert.deepEqual(particle.lastUpdate, {data: {}, originator: false});
    assert.equal(Entity.id(particle.lastUpdate.data), 'id');
  });

  it('uses the storage proxy versionMap', async () => {
    const handle = await getSingletonHandle(barType);

    const versionMap: VersionMap = {'actor': 1, 'other': 2};
    // Set the storageProxy version map.
    await handle.storageProxy.onMessage({
      type: ProxyMessageType.ModelUpdate,
      model: {values: {}, version: versionMap},
      id: 1
    });

    // This will pull in the version map above.
    await handle.fetch();
    // Swap out storageProxy.applyOp to check the updated versionMap is passed in the next op.
    let capturedVersionMap;
    handle.storageProxy.applyOp = async (op: SingletonOperation<{id: string}>) => {
      if (op.type === SingletonOpTypes.Set || op.type === SingletonOpTypes.Clear) {
        capturedVersionMap = op.versionMap;
      } else {
        capturedVersionMap = op.newVersionMap;
      }

      return true;
    };
    // Use an op that does not increment the versionMap.
    await handle.clear();
    assert.deepEqual(capturedVersionMap, versionMap);
  });

  it('respects canWrite', async () => {
    const handle = await getSingletonHandle(barType, new MockParticle(), true, false);
    try {
      await handle.set(newEntity('A'));
      assert.fail('handle.set should not have succeeded');
    } catch (e) {
      assert.match(e.toString(), /Error: Handle not writeable/);
    }
    try {
      await handle.clear();
      assert.fail('handle.clear should not have succeeded');
    } catch (e) {
      assert.match(e.toString(), /Error: Handle not writeable/);
    }
  });

  it('respects canRead', async () => {
    const handle = await getSingletonHandle(barType, new MockParticle(), false, true);
    try {
      await handle.fetch();
      assert.fail('handle.fetch should not have succeeded');
    } catch (e) {
      assert.match(e.toString(), /Error: Handle not readable/);
    }
  });
});

describe('EntityHandle', async () => {
  it('can sync when the entity has both singleton and collection fields', async () => {
    const manifest = await Manifest.parse(`
      schema Simple
        txt: Text
        flag: Boolean
        nums: [Number]
    `);
    const simpleSchema = manifest.schemas.Simple;
    const simpleEntityClass = Entity.createEntityClass(simpleSchema, null);
    const simpleEntity = new simpleEntityClass({txt: 'Text', flag: true, nums: [1, 2]});
    const simpleId = 'simpleId';
    Entity.identify(simpleEntity, simpleId, null);

    const particle: MockParticle = new MockParticle();
    const handle = await getEntityHandle(simpleSchema, simpleId, particle);

    // creating CRDTEntity
    const singletons = {
      txt: new CRDTSingleton<{id: string, value: string}>(),
      flag: new CRDTSingleton<{id: string, value: boolean}>()
    };
    const collections = {
      nums: new CRDTCollection<{id: string, value: number}>()
    };
    const entityCRDT = new CRDTEntity(singletons, collections);
    entityCRDT.applyOperation({type: EntityOpTypes.Set, field: 'txt', value: {id: 'Text', value: 'Text'}, actor: 'me', versionMap: {'me': 1}});
    entityCRDT.applyOperation({type: EntityOpTypes.Set, field: 'flag', value: {id: 'true', value: true}, actor: 'me', versionMap: {'me': 2}});
    entityCRDT.applyOperation({type: EntityOpTypes.Add, field: 'nums', added: {id: '1', value: 1}, actor: 'me', versionMap: {'me': 3}});
    entityCRDT.applyOperation({type: EntityOpTypes.Add, field: 'nums', added: {id: '2', value: 2}, actor: 'me', versionMap: {'me': 4}});

    await handle.onSync(entityCRDT.getParticleView());

    assert.isTrue(particle.onSyncCalled);
    assert.deepEqual(particle.model, simpleEntity);
  });

  it('can sync when the entity has a reference field', async () => {
    const manifest = await Manifest.parse(`
      schema Bar
        value: Text

      schema Foo
        txt: Text
        ref: &Bar
    `);
    const barSchema = manifest.schemas.Bar;
    barType = new EntityType(barSchema);
    const barId = 'barId';
    const storageKey = 'reference-mode://{volatile://!1:test/backing@}{volatile://!2:test/container@}';
    const barReference = new Reference({id: barId, entityStorageKey: storageKey}, new ReferenceType(barType), null);

    const fooSchema = manifest.schemas.Foo;
    const fooEntityClass = Entity.createEntityClass(fooSchema, null);
    const fooId = 'fooId';
    const fooEntity = new fooEntityClass({txt: 'Text', ref: barReference}, null);
    Entity.identify(fooEntity, fooId, null);

    const particle: MockParticle = new MockParticle();
    const handle = await getEntityHandle(fooSchema, fooId, particle);

    // creating a CRDTEntity
    const singletons = {
      txt: new CRDTSingleton<{id: string, value: string}>(),
      ref: new CRDTSingleton<Reference>()
    };
    const collections = {};
    const entityCRDT = new CRDTEntity(singletons, collections);
    entityCRDT.applyOperation({type: EntityOpTypes.Set, field: 'txt', value: {id: 'Text', value: 'Text'}, actor: 'me', versionMap: {'me': 1}});
    entityCRDT.applyOperation({type: EntityOpTypes.Set, field: 'ref', value: barReference, actor: 'me', versionMap: {me: 2}});

    await handle.onSync(entityCRDT.getParticleView());

    assert.isTrue(particle.onSyncCalled);
    assert.deepEqual(particle.model, fooEntity);
  });

  it('can sync when the entity has singleton fields and a collection of references field', async () => {
    const manifest = await Manifest.parse(`
      schema Bar
        value: Text

      schema Foo
        txt: Text
        refs: [&Bar]
    `);
    const barSchema = manifest.schemas.Bar;
    barType = new EntityType(barSchema);
    const barId = 'barId';
    const storageKey = 'reference-mode://{volatile://!1:test/backing@}{volatile://!2:test/container@}';
    const barReference = new Reference({id: barId, entityStorageKey: storageKey}, new ReferenceType(barType), null);

    const fooSchema = manifest.schemas.Foo;
    const fooEntityClass = Entity.createEntityClass(fooSchema, null);
    const fooId = 'fooId';
    const fooEntity = new fooEntityClass({txt: 'Text', refs: [barReference]}, null);
    Entity.identify(fooEntity, fooId, null);

    const particle: MockParticle = new MockParticle();
    const handle = await getEntityHandle(fooSchema, fooId, particle);

    // creating a CRDTEntity
    const singletons = {
      txt: new CRDTSingleton<{id: string, value: string}>()
    };
    const collections = {
      refs: new CRDTCollection<Reference>()
    };
    const entityCRDT = new CRDTEntity(singletons, collections);
    entityCRDT.applyOperation({type: EntityOpTypes.Set, field: 'txt', value: {id: 'Text', value: 'Text'}, actor: 'me', versionMap: {'me': 1}});
    entityCRDT.applyOperation({type: EntityOpTypes.Add, field: 'refs', added: barReference, actor: 'me', versionMap: {me: 2}});

    await handle.onSync(entityCRDT.getParticleView());

    assert.isTrue(particle.onSyncCalled);
    assert.deepEqual(particle.model, fooEntity);
  });

  it('can fetch', async () => {
    const manifest = await Manifest.parse(`
    schema Simple
      txt: Text
      flag: Boolean
      nums: [Number]
  `);
  const simpleSchema = manifest.schemas.Simple;
  const simpleEntityClass = Entity.createEntityClass(simpleSchema, null);
  const simpleMuxId = 'simpleMuxId';

  const particle: MockParticle = new MockParticle();
  const handle = await getEntityHandle(simpleSchema, simpleMuxId, particle);

  // creating CRDTEntity
  const singletons = {
    txt: new CRDTSingleton<{id: string, value: string}>(),
    flag: new CRDTSingleton<{id: string, value: boolean}>()
  };
  const collections = {
    nums: new CRDTCollection<{id: string, value: number}>()
  };
  const entityCRDT = new CRDTEntity(singletons, collections);
  entityCRDT.applyOperation({type: EntityOpTypes.Set, field: 'txt', value: {id: 'Text', value: 'Text'}, actor: 'me', versionMap: {'me': 1}});
  entityCRDT.applyOperation({type: EntityOpTypes.Set, field: 'flag', value: {id: 'true', value: true}, actor: 'me', versionMap: {'me': 2}});
  entityCRDT.applyOperation({type: EntityOpTypes.Add, field: 'nums', added: {id: '1', value: 1}, actor: 'me', versionMap: {'me': 3}});
  entityCRDT.applyOperation({type: EntityOpTypes.Add, field: 'nums', added: {id: '2', value: 2}, actor: 'me', versionMap: {'me': 4}});

  // initialize model in storageProxy
  await handle.storageProxy.onMessage({
    type: ProxyMessageType.ModelUpdate,
    model: entityCRDT.getData(),
    id: 1
  });

  const entity = await handle.fetch();
  assert.deepEqual(entity, new simpleEntityClass({txt: 'Text', flag: true, nums: [1, 2]}));
  });

  it('can mutate collection fields by providing new data', async () => {
    const manifest = await Manifest.parse(`
    schema Simple
      nums: [Number]
    `);
    const simpleSchema = manifest.schemas.Simple;
    const simpleEntityClass = Entity.createEntityClass(simpleSchema, null);
    const simpleMuxId = 'simpleMuxId';

    const particle: MockParticle = new MockParticle();
    const handle = await getEntityHandle(simpleSchema, simpleMuxId, particle);

    // creating CRDTEntity
    const singletons = {};
    const collections = {
      nums: new CRDTCollection<{id: string, value: number}>()
    };
    const entityCRDT = new CRDTEntity(singletons, collections);

    entityCRDT.applyOperation({type: EntityOpTypes.Add, field: 'nums', added: {id: '1', value: 1}, actor: 'me', versionMap: {'me': 1}});
    entityCRDT.applyOperation({type: EntityOpTypes.Add, field: 'nums', added: {id: '2', value: 2}, actor: 'me', versionMap: {'me': 2}});

    // initialize model in storageProxy
    await handle.storageProxy.onMessage({
      type: ProxyMessageType.ModelUpdate,
      model: entityCRDT.getData(),
      id: 1
    });

    await handle.mutate({nums: [1, 2, 3]});

    const entityVersion1 = await handle.fetch();
    assert.deepEqual(entityVersion1, new simpleEntityClass({nums: [1, 2, 3]}));

    await handle.mutate({nums: [1, 3]});
    const entityVersion2 = await handle.fetch();
    assert.deepEqual(entityVersion2, new simpleEntityClass({nums: [1, 3]}));

    await handle.mutate({nums: [4, 7, 15]});
    const entityVersion3 = await handle.fetch();
    assert.deepEqual(entityVersion3, new simpleEntityClass({nums: [4, 7, 15]}));
  });

  it('can mutate collection fields with a callback function', async () => {
    const manifest = await Manifest.parse(`
    schema Simple
      nums: [Number]
    `);
    const simpleSchema = manifest.schemas.Simple;
    const simpleEntityClass = Entity.createEntityClass(simpleSchema, null);
    const simpleMuxId = 'simpleMuxId';

    const particle: MockParticle = new MockParticle();
    const handle = await getEntityHandle(simpleSchema, simpleMuxId, particle);

    // creating CRDTEntity
    const singletons = {};
    const collections = {
      nums: new CRDTCollection<{id: string, value: number}>()
    };
    const entityCRDT = new CRDTEntity(singletons, collections);

    entityCRDT.applyOperation({type: EntityOpTypes.Add, field: 'nums', added: {id: '1', value: 1}, actor: 'me', versionMap: {'me': 1}});
    entityCRDT.applyOperation({type: EntityOpTypes.Add, field: 'nums', added: {id: '2', value: 2}, actor: 'me', versionMap: {'me': 2}});

    // initialize model in storageProxy
    await handle.storageProxy.onMessage({
      type: ProxyMessageType.ModelUpdate,
      model: entityCRDT.getData(),
      id: 1
    });

    await handle.mutate(e => e.nums.add(3));

    const entityVersion1 = await handle.fetch();
    assert.deepEqual(entityVersion1, new simpleEntityClass({nums: [1, 2, 3]}));

    await handle.mutate(e => e.nums.delete(2));
    const entityVersion2 = await handle.fetch();
    assert.deepEqual(entityVersion2, new simpleEntityClass({nums: [1, 3]}));

    await handle.mutate(e => e.nums = new Set([4, 7, 15]));
    const entityVersion3 = await handle.fetch();
    assert.deepEqual(entityVersion3, new simpleEntityClass({nums: [4, 7, 15]}));
  });

  it('can mutate singleton fields by providing new data', async () => {
    const manifest = await Manifest.parse(`
    schema Simple
      txt: Text
      flag: Boolean
    `);
    const simpleSchema = manifest.schemas.Simple;
    const simpleEntityClass = Entity.createEntityClass(simpleSchema, null);
    const simpleMuxId = 'simpleMuxId';

    const particle: MockParticle = new MockParticle();
    const handle = await getEntityHandle(simpleSchema, simpleMuxId, particle);

    // creating CRDTEntity
    const singletons = {
      txt: new CRDTSingleton<{id: string, value: string}>(),
      flag: new CRDTSingleton<{id: string, value: boolean}>()
    };
    const collections = {};
    const entityCRDT = new CRDTEntity(singletons, collections);
    entityCRDT.applyOperation({type: EntityOpTypes.Set, field: 'txt', value: {id: 'Text', value: 'Text'}, actor: 'me', versionMap: {'me': 1}});
    entityCRDT.applyOperation({type: EntityOpTypes.Set, field: 'flag', value: {id: 'true', value: true}, actor: 'me', versionMap: {'me': 2}});

    // initialize model in storageProxy
    await handle.storageProxy.onMessage({
      type: ProxyMessageType.ModelUpdate,
      model: entityCRDT.getData(),
      id: 1
    });

    await handle.mutate({txt: 'different text', flag: true});
    const entityVersion1 = await handle.fetch();
    assert.deepEqual(entityVersion1, new simpleEntityClass({txt: 'different text', flag: true}));

    await handle.mutate({txt: 'different text again', flag: false});
    const entityVersion2 = await handle.fetch();
    assert.deepEqual(entityVersion2, new simpleEntityClass({txt: 'different text again', flag: false}));

    await handle.mutate({txt: null, flag: null});
    const entityVersion3 = await handle.fetch();
    assert.deepEqual(entityVersion3, new simpleEntityClass({txt: null, flag: null}));
  });

  it('can mutate singleton fields with a callback function', async () => {
    const manifest = await Manifest.parse(`
    schema Simple
      txt: Text
      flag: Boolean
    `);
    const simpleSchema = manifest.schemas.Simple;
    const simpleEntityClass = Entity.createEntityClass(simpleSchema, null);
    const simpleMuxId = 'simpleMuxId';

    const particle: MockParticle = new MockParticle();
    const handle = await getEntityHandle(simpleSchema, simpleMuxId, particle);

    // creating CRDTEntity
    const singletons = {
      txt: new CRDTSingleton<{id: string, value: string}>(),
      flag: new CRDTSingleton<{id: string, value: boolean}>()
    };
    const collections = {};
    const entityCRDT = new CRDTEntity(singletons, collections);
    entityCRDT.applyOperation({type: EntityOpTypes.Set, field: 'txt', value: {id: 'Text', value: 'Text'}, actor: 'me', versionMap: {'me': 1}});
    entityCRDT.applyOperation({type: EntityOpTypes.Set, field: 'flag', value: {id: 'true', value: true}, actor: 'me', versionMap: {'me': 2}});

    // initialize model in storageProxy
    await handle.storageProxy.onMessage({
      type: ProxyMessageType.ModelUpdate,
      model: entityCRDT.getData(),
      id: 1
    });

    await handle.mutate(e => e.txt = 'different text');
    const entityVersion1 = await handle.fetch();
    assert.deepEqual(entityVersion1, new simpleEntityClass({txt: 'different text', flag: true}));

    await handle.mutate(e => e.flag = false);
    const entityVersion2 = await handle.fetch();
    assert.deepEqual(entityVersion2, new simpleEntityClass({txt: 'different text', flag: false}));

    await handle.mutate(e => {
      e.flag = true;
      e.txt = 'different text again';
    });
    const entityVersion3 = await handle.fetch();
    assert.deepEqual(entityVersion3, new simpleEntityClass({txt: 'different text again', flag: true}));
  });

  it('can mutate both singleton and collection fields', async () => {
    const manifest = await Manifest.parse(`
    schema Simple
      txt: Text
      flag: Boolean
      nums: [Number]
    `);
    const simpleSchema = manifest.schemas.Simple;
    const simpleEntityClass = Entity.createEntityClass(simpleSchema, null);
    const simpleMuxId = 'simpleMuxId';

    const particle: MockParticle = new MockParticle();
    const handle = await getEntityHandle(simpleSchema, simpleMuxId, particle);

    // creating CRDTEntity
    const singletons = {
      txt: new CRDTSingleton<{id: string, value: string}>(),
      flag: new CRDTSingleton<{id: string, value: boolean}>()
    };
    const collections = {
      nums: new CRDTCollection<{id: string, value: number}>()
    };
    const entityCRDT = new CRDTEntity(singletons, collections);
    entityCRDT.applyOperation({type: EntityOpTypes.Set, field: 'txt', value: {id: 'Text', value: 'Text'}, actor: 'me', versionMap: {'me': 1}});
    entityCRDT.applyOperation({type: EntityOpTypes.Set, field: 'flag', value: {id: 'true', value: true}, actor: 'me', versionMap: {'me': 2}});
    entityCRDT.applyOperation({type: EntityOpTypes.Add, field: 'nums', added: {id: '1', value: 1}, actor: 'me', versionMap: {'me': 3}});
    entityCRDT.applyOperation({type: EntityOpTypes.Add, field: 'nums', added: {id: '2', value: 2}, actor: 'me', versionMap: {'me': 4}});

    // initialize model in storageProxy
    await handle.storageProxy.onMessage({
      type: ProxyMessageType.ModelUpdate,
      model: entityCRDT.getData(),
      id: 1
    });

    await handle.mutate(e => e.txt = 'TEXT');
    const entityVersion1 = await handle.fetch();
    assert.deepEqual(entityVersion1, new simpleEntityClass({txt: 'TEXT', flag: true, nums: [1, 2]}));

    await handle.mutate({txt: 'different text', flag: true, nums: [1, 2]});
    const entityVersion2 = await handle.fetch();
    assert.deepEqual(entityVersion2, new simpleEntityClass({txt: 'different text', flag: true, nums: [1, 2]}));

    await handle.mutate({txt: 'different text', flag: false, nums: [2, 3, 4, 5]});
    const entityVersion3 = await handle.fetch();
    assert.deepEqual(entityVersion3, new simpleEntityClass({txt: 'different text', flag: false, nums: [2, 3, 4, 5]}));
  });

});
