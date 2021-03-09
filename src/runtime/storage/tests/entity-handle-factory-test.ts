/**
 * @license
 * Copyright (c) 2020 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {Manifest} from '../../manifest.js';
import {EntityType, MuxType, SingletonType} from '../../../types/lib-types.js';
import {MockStoreInfo, MockDirectStoreMuxer} from '../testing/test-storage.js';
import {CRDTEntityTypeRecord, Identified, CRDTEntity, EntityOpTypes, CRDTSingleton} from '../../../crdt/lib-crdt.js';
import {StorageProxyMuxer} from '../storage-proxy-muxer.js';
import {DirectStoreMuxer} from '../direct-store-muxer.js';
import {EntityHandleFactory} from '../entity-handle-factory.js';
import {ProxyMessageType, StorageCommunicationEndpoint} from '../store-interface.js';
import {assert} from '../../../platform/chai-web.js';
import {Entity} from '../../entity.js';
import {ArcId} from '../../id.js';
import {ReferenceModeStorageKey} from '../reference-mode-storage-key.js';
import {VolatileStorageKey} from '../drivers/volatile.js';
import {Loader} from '../../../platform/loader.js';
import {TestVolatileMemoryProvider} from '../../testing/test-volatile-memory-provider.js';
import {Runtime} from '../../runtime.js';
import {CRDTMuxEntity, SingletonReferenceType, SingletonEntityType, handleForStoreInfo, CRDTTypeRecordToType, TypeToCRDTTypeRecord} from '../storage.js';
import {Reference} from '../../reference.js';
import {StoreInfo} from '../store-info.js';
import {DirectStorageEndpoint} from '../direct-storage-endpoint.js';

describe('entity handle factory', () => {
  let runtime;
  beforeEach(() => {
    runtime = new Runtime();
  });
  it('can produce entity handles upon request', async () => {
    const manifest = await Manifest.parse(`
    schema Foo
      value: Text
    `);
    const fooSchema = manifest.schemas.Foo;
    const fooEntityClass = Entity.createEntityClass(fooSchema, null);
    const fooEntityType = EntityType.make(['Foo'], {value: 'Text'});

    const fooEntity1 = new fooEntityClass({value: 'Text'});
    const fooMuxId1 = 'fooMuxId1';
    Entity.identify(fooEntity1, fooMuxId1, null);

    const fooEntity1CRDT = new CRDTEntity({value: new CRDTSingleton<{id: string, value: string}>()}, {});
    fooEntity1CRDT.applyOperation({type: EntityOpTypes.Set, field: 'value', value: {id: 'Text', value: 'Text'}, actor: 'me', versionMap: {'me': 1}});

    const fooEntity2 = new fooEntityClass({value: 'OtherText'});
    const fooMuxId2 = 'fooMuxId2';
    Entity.identify(fooEntity2, fooMuxId2, null);

    const fooEntity2CRDT = new CRDTEntity({value: new CRDTSingleton<{id: string, value: string}>()}, {});
    fooEntity2CRDT.applyOperation({type: EntityOpTypes.Set, field: 'value', value: {id: 'Text', value: 'OtherText'}, actor: 'me', versionMap: {'me': 1}});

    const mockDirectStoreMuxer = new MockDirectStoreMuxer<CRDTMuxEntity>(new MockStoreInfo(new MuxType(fooEntityType)));
    const storageProxyMuxer = new StorageProxyMuxer(new DirectStorageEndpoint(mockDirectStoreMuxer, runtime.storageKeyParser));
    const entityHandleProducer = new EntityHandleFactory(storageProxyMuxer);

    const entityHandle1 = entityHandleProducer.getHandle(fooMuxId1);

    // A new handle will trigger a sync request
    assert.deepEqual(mockDirectStoreMuxer.lastCapturedMessage, {type: ProxyMessageType.SyncRequest, muxId: fooMuxId1, id: 1});

    // Ensure communication between newly created entity handle and direct store muxer
    await storageProxyMuxer.onMessage({type: ProxyMessageType.ModelUpdate, model: fooEntity1CRDT.getData(), muxId: fooMuxId1});
    await storageProxyMuxer.getStorageProxy(fooMuxId1).idle();
    const entity1 = await entityHandle1.fetch();
    assert.deepEqual(entity1, fooEntity1);

    const entityHandle2 = entityHandleProducer.getHandle(fooMuxId2);
    assert.deepEqual(mockDirectStoreMuxer.lastCapturedMessage, {type: ProxyMessageType.SyncRequest, muxId: fooMuxId2, id: 1});
    await storageProxyMuxer.onMessage({type: ProxyMessageType.ModelUpdate, model: fooEntity2CRDT.getData(), muxId: fooMuxId2});
    await storageProxyMuxer.getStorageProxy(fooMuxId2).idle();
    const entity2 = await entityHandle2.fetch();
    assert.deepEqual(entity2, fooEntity2);
  });
  it('can parse muxType handle in manifest', async () => {
    const manifest = await Manifest.parse(`
      schema Result
        value: Text

      particle Dereferencer in 'dereferencer.js'
        inResult: reads &Result
        inResultData: reads #Result

      recipe
        handle0: create 'input:1'
        handle1: create 'input:2'
        Dereferencer
          inResult: reads handle0
          inResultData: reads handle1
    `);
    const recipe = manifest.recipes[0];
    assert.isTrue(recipe.normalize());
    assert.isTrue(recipe.isResolved());
    assert.strictEqual(recipe.handles[0].id, 'input:1');
    assert.strictEqual(recipe.handles[1].id, 'input:2');
    recipe.handles[1].type.maybeResolve();
    assert.instanceOf(recipe.handles[1].type, MuxType);
    assert.strictEqual((recipe.handles[1].type.resolvedType() as MuxType<EntityType>).innerType.entitySchema.name, 'Result');
  });
  it('generated entity handle can fetch entity', async () => {
    const storageKeyPrefix = (arcId: ArcId) => new ReferenceModeStorageKey(new VolatileStorageKey(arcId, 'a'), new VolatileStorageKey(arcId, 'b'));
    const loader = new Loader(null, {
      './manifest': `
        schema Result
          value: Text

        particle Dereferencer in 'dereferencer.js'
          inResult: reads &Result
          inResultData: reads #Result
          outResult: writes Result

        recipe
          handle0: create 'input:1'
          handle1: create 'input:2'
          handle2: create 'output:1'
          Dereferencer
            inResult: reads handle0
            inResultData: reads handle1
            outResult: writes handle2
      `,
      './dereferencer.js': `
        defineParticle(({Particle}) => {
          return class Dereferencer extends Particle {
            setHandles(handles) {
              this.entityHandleFactory = handles.get('inResultData');
              this.outHandle = handles.get('outResult');
            }

            async onHandleUpdate(handle, update) {
              if (handle.name == 'inResult') {
                const entityHandle = await this.entityHandleFactory.getHandle(update.data.id);
                const entity = await entityHandle.fetch();
                this.outHandle.set(entity);
              }
            }
          }
        });
      `
    });
    const memoryProvider = new TestVolatileMemoryProvider();

    const manifest = await Manifest.load('./manifest', loader, {memoryProvider});
    const runtime = new Runtime({loader, context: manifest, memoryProvider});
    const arc = runtime.getArcById(runtime.allocator.newArc({arcName: 'test', storageKeyPrefix}));
    const recipe = manifest.recipes[0];
    const result = Entity.createEntityClass(manifest.findSchemaByName('Result'), null);

    const refModeStore = await arc.createStore(
      new SingletonType(result.type),
      undefined,
      'test:1',
      undefined,
      new ReferenceModeStorageKey(new VolatileStorageKey(arc.id, '/handle/input:2'), new VolatileStorageKey(arc.id, 'b'))
    );

    await runtime.allocator.runPlanInArc(arc.id, recipe);
    await arc.idle;

    const handleForEntity = await handleForStoreInfo(refModeStore, arc);
    const entity = await handleForEntity.setFromData({value: 'val1'});
    await arc.idle;

    const inputStore = arc.findStoreById('input:1') as StoreInfo<SingletonReferenceType>;
    const outputStore = arc.findStoreById('output:1') as StoreInfo<SingletonEntityType>;

    const handleForInput = await handleForStoreInfo(inputStore, arc);
    await handleForInput.set(new Reference({id: Entity.id(entity), entityStorageKey: refModeStore.storageKey.toString()}, inputStore.type.getContainedType(), handleForInput.storageFrontend));
    await arc.idle;

    const handleForOutput = await handleForStoreInfo(outputStore, arc);
    const output = await handleForOutput.fetch();
    assert.equal(output.value, 'val1');
  });
  it('generated entity handle can mutate entity', async () => {
    const storageKeyPrefix = (arcId: ArcId) => new ReferenceModeStorageKey(new VolatileStorageKey(arcId, 'a'), new VolatileStorageKey(arcId, 'b'));
    const loader = new Loader(null, {
      './manifest': `
        schema Result
          colour: Text

        particle EntityMutator in 'entityMutator.js'
          inResult: reads &Result
          inResultData: reads #Result

        recipe
          handle0: create 'input:1'
          handle1: create 'input:2'
          EntityMutator
            inResult: reads handle0
            inResultData: reads handle1
      `,
      './entityMutator.js': `
        defineParticle(({Particle}) => {
          return class EntityMutator extends Particle {
            setHandles(handles) {
              this.entityHandleFactory = handles.get('inResultData');
            }

            async onHandleUpdate(handle, update) {
              if (handle.name == 'inResult') {
                const entityHandle = await this.entityHandleFactory.getHandle(update.data.id);
                entityHandle.mutate({colour: 'purple'});
              }
            }
          }
        });
      `
    });
    const memoryProvider = new TestVolatileMemoryProvider();

    const manifest = await Manifest.load('./manifest', loader, {memoryProvider});
    const runtime = new Runtime({loader, context: manifest, memoryProvider});
    const arc = runtime.getArcById(runtime.allocator.newArc({arcName: 'test', storageKeyPrefix}));
    const recipe = manifest.recipes[0];
    const result = Entity.createEntityClass(manifest.findSchemaByName('Result'), null);

    const refModeStore = await arc.createStore(
      new SingletonType(result.type),
      undefined,
      'test:1',
      undefined,
      new ReferenceModeStorageKey(new VolatileStorageKey(arc.id, '/handle/input:2'), new VolatileStorageKey(arc.id, 'b'))
    );

    const dsmForVerifying = await arc.createStore(
      new MuxType(result.type),
      undefined,
      'test:2',
      undefined,
      new VolatileStorageKey(arc.id, '/handle/input:2')
    );

    await runtime.allocator.runPlanInArc(arc.id, recipe);
    await arc.idle;

    // create and store an entity in the reference mode store.
    const handleForEntity = await handleForStoreInfo(refModeStore, arc);
    const entity = await handleForEntity.setFromData({colour: 'red'});
    await arc.idle;

    // fetch the entity from dsmForVerifying store
    const entityHandleFactory = await handleForStoreInfo(dsmForVerifying, arc);
    const entityHandle = entityHandleFactory.getHandle(Entity.id(entity));
    let output = await entityHandle.fetch();
    assert.equal(output.colour, 'red');

    // create and store a reference to the entity in the input
    const inResultStore = arc.findStoreById('input:1') as StoreInfo<SingletonReferenceType>;
    const inputForInResultStore = await handleForStoreInfo(inResultStore, arc);
    await inputForInResultStore.set(new Reference({id: Entity.id(entity), entityStorageKey: refModeStore.storageKey.toString()}, inResultStore.type.getContainedType(), inputForInResultStore.storageFrontend));
    await arc.idle;

    // fetch the entity again and check it has been mutated.
    output = await entityHandle.fetch();
    assert.equal(output.colour, 'purple');
  });
  it('two particles can mutate entity', async () => {
    const storageKeyPrefix = (arcId: ArcId) => new ReferenceModeStorageKey(new VolatileStorageKey(arcId, 'a'), new VolatileStorageKey(arcId, 'b'));
    const loader = new Loader(null, {
      './manifest': `
      schema Result
        colour: Text

      particle EntityMutator1 in 'entityMutator1.js'
        inResult: reads &Result
        inResultData: reads #Result
      
      particle EntityMutator2 in 'entityMutator2.js'
        inResult: reads &Result
        inResultData: reads #Result
      
      recipe
        handle0: use *
        handle1: use *
        handle2: create 'input:0'
        handle3: create 'input:1'
        EntityMutator1
          inResult: reads handle2
          inResultData: reads handle0
        EntityMutator2
          inResult: reads handle3
          inResultData: reads handle1
      `,
      './entityMutator1.js': `
      defineParticle(({Particle}) => {
        return class EntityMutator1 extends Particle {
          setHandles(handles) {
            this.entityHandleFactory = handles.get('inResultData');
          }

          async onHandleUpdate(handle, update) {
            if (handle.name == 'inResult') {
              const entityHandle = await this.entityHandleFactory.getHandle(update.data.id);
              entityHandle.mutate({colour: 'purple'});
            }
          }
        }
      });
      `,
      './entityMutator2.js': `
        defineParticle(({Particle}) => {
          return class EntityMutator2 extends Particle {
            setHandles(handles) {
              this.entityHandleFactory = handles.get('inResultData');
            }

            async onHandleUpdate(handle, update) {
              if (handle.name == 'inResult') {
                const entityHandle = await this.entityHandleFactory.getHandle(update.data.id);
                entityHandle.mutate({colour: 'pink'});
              }
            }
          }
        });
      `
    });
    const memoryProvider = new TestVolatileMemoryProvider();

    const manifest = await Manifest.load('./manifest', loader, {memoryProvider});
    const runtime = new Runtime({loader, context: manifest, memoryProvider});
    const arc = runtime.getArcById(runtime.allocator.newArc({arcName: 'test', storageKeyPrefix}));
    const recipe = manifest.recipes[0];
    const result = Entity.createEntityClass(manifest.findSchemaByName('Result'), null);

    const dsm1 = await arc.createStore(
      new MuxType(result.type),
      undefined,
      'test:2',
      undefined,
      new VolatileStorageKey(arc.id, 'input:2')
    );

    const dsm2 = await arc.createStore(
      new MuxType(result.type),
      undefined,
      'test:3',
      undefined,
      new VolatileStorageKey(arc.id, 'input:2')
    );

    const dsmForVerifying = await arc.createStore(
      new MuxType(result.type),
      undefined,
      'test:4',
      undefined,
      new VolatileStorageKey(arc.id, 'input:2')
    );

    const refModeStore = await arc.createStore(
      new SingletonType(result.type),
      undefined,
      'test:1',
      undefined,
      new ReferenceModeStorageKey(new VolatileStorageKey(arc.id, 'input:2'), new VolatileStorageKey(arc.id, 'b'))
    );

    recipe.handles[0].mapToStorage(dsm1);
    recipe.handles[1].mapToStorage(dsm2);

    await runtime.allocator.runPlanInArc(arc.id, recipe);
    await arc.idle;

    // create and store an entity in the reference mode store.
    const handleForEntity = await handleForStoreInfo(refModeStore, arc);
    const entity = await handleForEntity.setFromData({colour: 'red'});
    await arc.idle;

    // fetch the entity from dsmForVerifying store
    const handleFactoryForMutatedEntity = await handleForStoreInfo(dsmForVerifying, arc);
    const handleForMutatedEntity = handleFactoryForMutatedEntity.getHandle(Entity.id(entity));
    let output = await handleForMutatedEntity.fetch();
    assert.equal(output.colour, 'red');

    // create and store a reference to the entity in the input store for the entityMutator1 particle
    const entityMutator1Store = arc.findStoreById('input:0') as StoreInfo<SingletonReferenceType>;
    const inputHandleForEntityMutator1 = await handleForStoreInfo(entityMutator1Store, arc);
    await inputHandleForEntityMutator1.set(new Reference({id: Entity.id(entity), entityStorageKey: refModeStore.storageKey.toString()}, entityMutator1Store.type.getContainedType(), inputHandleForEntityMutator1.storageFrontend));
    await arc.idle;

    // fetch the entity from dsmForVerifying store and check it has been mutated.
    output = await handleForMutatedEntity.fetch();
    assert.equal(output.colour, 'purple');

    // create and store a reference to the entity in the input store for the entityMutator2 particle
    const entityMutator2Store = arc.findStoreById('input:1') as StoreInfo<SingletonReferenceType>;
    const handleForEntityMutator2 = await handleForStoreInfo(entityMutator2Store, arc);
    await handleForEntityMutator2.set(new Reference({id: Entity.id(entity), entityStorageKey: refModeStore.storageKey.toString()}, entityMutator1Store.type.getContainedType(), handleForEntityMutator2.storageFrontend));
    await arc.idle;

    // fetch the entity from dsmForVerifying store and check it has been mutated again.
    output = await handleForMutatedEntity.fetch();
    assert.equal(output.colour, 'pink');
  });
});
