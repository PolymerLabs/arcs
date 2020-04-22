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
import {VersionMap} from '../../crdt/crdt.js';
import {CollectionOperation, CollectionOpTypes, CRDTCollectionTypeRecord, Referenceable, CRDTCollection} from '../../crdt/crdt-collection.js';
import {CRDTSingletonTypeRecord, SingletonOperation, SingletonOpTypes, CRDTSingleton} from '../../crdt/crdt-singleton.js';
import {IdGenerator} from '../../id.js';
import {Particle} from '../../particle.js';
import {CollectionType, EntityType, SingletonType, Type, ReferenceType} from '../../type.js';
import {CollectionHandle, SingletonHandle, EntityHandle} from '../handle.js';
import {StorageProxy} from '../storage-proxy.js';
import {ProxyMessageType} from '../store.js';
import {MockParticle, MockStore} from '../testing/test-storage.js';
import {Manifest} from '../../manifest.js';
import {EntityClass, Entity, SerializedEntity} from '../../entity.js';
import {SYMBOL_INTERNALS} from '../../symbols.js';
import {CRDTEntityCollection, CollectionEntityStore} from '../storage-ng.js';
import {CRDTEntityTypeRecord, Identified, CRDTEntity, EntityOpTypes} from '../../crdt/crdt-entity.js';
import {Schema} from '../../schema.js';
import {Reference} from '../../reference.js';


async function getCollectionHandle(primitiveType: Type, particle?: MockParticle, canRead=true, canWrite=true):
    Promise<CollectionHandle<Entity>> {
  const fakeParticle: Particle = (particle || new MockParticle()) as unknown as Particle;
  const store = new MockStore<CRDTEntityCollection>() as unknown as CollectionEntityStore;
  const handle = new CollectionHandle(
      'me',
      new StorageProxy(
          'id',
          new MockStore<CRDTCollectionTypeRecord<SerializedEntity>>(),
          new CollectionType(primitiveType),
          null),
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

async function getSingletonHandle(primitiveType: Type, particle?: MockParticle, canRead=true, canWrite=true):
    Promise<SingletonHandle<Entity>> {
  const fakeParticle: Particle = (particle || new MockParticle()) as unknown as Particle;
  const handle = new SingletonHandle(
      'me',
      new StorageProxy(
          'id',
          new MockStore<CRDTSingletonTypeRecord<SerializedEntity>>(),
          new SingletonType(primitiveType),
          null),
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

async function getEntityHandle(schema: Schema, muxId: string, particle?: MockParticle, canRead=true, canWrite=false):
    Promise<EntityHandle<Entity>> {
  const fakeParticle: Particle = (particle || new MockParticle()) as unknown as Particle;
  const storageProxy = new StorageProxy('id', new MockStore<CRDTEntityTypeRecord<Identified, Identified>>(), new EntityType(schema), null);
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
      clock: {'actor': 1}
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
      oldClock: {'actor': 1},
      newClock: {'actor': 1}
    };
    await handle.onUpdate(op);
    assert.isTrue(particle.onSyncCalled);
  });

  it('uses the storage proxy clock', async () => {
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
    // Swap out storageProxy.applyOp to check the updated clock is passed in the next op.
    let capturedClock: VersionMap;
    handle.storageProxy.applyOp = async (op: CollectionOperation<{id: string}>) => {
      capturedClock = 'clock' in op ? op.clock : null;
      return true;
    };
    // Use an op that does not increment the clock.
    await handle.remove(newEntity('id'));
    assert.deepEqual(capturedClock, versionMap);
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
      clock: {'other': 1},
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
      clock: {'actor': 1}
    };
    await handle.onUpdate(op);
    assert.deepEqual(particle.lastUpdate, {data: {}, originator: false});
    assert.equal(Entity.id(particle.lastUpdate.data), 'id');
  });

  it('uses the storage proxy clock', async () => {
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
    // Swap out storageProxy.applyOp to check the updated clock is passed in the next op.
    let capturedClock;
    handle.storageProxy.applyOp = async (op: SingletonOperation<{id: string}>) => {
      capturedClock = op.clock;
      return true;
    };
    // Use an op that does not increment the clock.
    await handle.clear();
    assert.deepEqual(capturedClock, versionMap);
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
    entityCRDT.applyOperation({type: EntityOpTypes.Set, field: 'txt', value: {id: 'Text', value: 'Text'}, actor: 'me', clock: {'me': 1}});
    entityCRDT.applyOperation({type: EntityOpTypes.Set, field: 'flag', value: {id: 'true', value: true}, actor: 'me', clock: {'me': 1}});
    entityCRDT.applyOperation({type: EntityOpTypes.Add, field: 'nums', added: {id: '1', value: 1}, actor: 'me', clock: {'me': 1}});
    entityCRDT.applyOperation({type: EntityOpTypes.Add, field: 'nums', added: {id: '2', value: 2}, actor: 'me', clock: {'me': 2}});

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
    const barEntityClass = Entity.createEntityClass(barSchema, null);
    barType = new EntityType(barSchema);
    const barId = 'barId';
    const barEntity = new barEntityClass({value: 'Text'});
    Entity.identify(barEntity, barId, null);
    const barReference = new Reference({id: barId, entityStorageKey: null}, new ReferenceType(barType), null);

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
    entityCRDT.applyOperation({type: EntityOpTypes.Set, field: 'txt', value: {id: 'Text', value: 'Text'}, actor: 'me', clock: {'me': 1}});
    entityCRDT.applyOperation({type: EntityOpTypes.Set, field: 'ref', value: barReference, actor: 'me', clock: {me: 1}});

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
    const barEntityClass = Entity.createEntityClass(barSchema, null);
    barType = new EntityType(barSchema);
    const barId = 'barId';
    const barEntity = new barEntityClass({value: 'Text'});
    Entity.identify(barEntity, barId, null);
    const barReference = new Reference({id: barId, entityStorageKey: null}, new ReferenceType(barType), null);

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
    entityCRDT.applyOperation({type: EntityOpTypes.Set, field: 'txt', value: {id: 'Text', value: 'Text'}, actor: 'me', clock: {'me': 1}});
    entityCRDT.applyOperation({type: EntityOpTypes.Add, field: 'refs', added: barReference, actor: 'me', clock: {me: 1}});

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
  const simpleEntity = new simpleEntityClass({txt: 'Text', flag: true, nums: [1, 2]});
  const simpleMuxId = 'simpleMuxId';
  Entity.identify(simpleEntity, simpleMuxId, null);

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
  entityCRDT.applyOperation({type: EntityOpTypes.Set, field: 'txt', value: {id: 'Text', value: 'Text'}, actor: 'me', clock: {'me': 1}});
  entityCRDT.applyOperation({type: EntityOpTypes.Set, field: 'flag', value: {id: 'true', value: true}, actor: 'me', clock: {'me': 1}});
  entityCRDT.applyOperation({type: EntityOpTypes.Add, field: 'nums', added: {id: '1', value: 1}, actor: 'me', clock: {'me': 1}});
  entityCRDT.applyOperation({type: EntityOpTypes.Add, field: 'nums', added: {id: '2', value: 2}, actor: 'me', clock: {'me': 2}});

  // initialize model in storageProxy
  await handle.storageProxy.onMessage({
    type: ProxyMessageType.ModelUpdate,
    model: entityCRDT.getData(),
    id: 1
  });

  const entity = await handle.fetch();
  assert.deepEqual(entity, simpleEntity);
  });
});
