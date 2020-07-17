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
import {EntityType, MuxType, SingletonType} from '../../type.js';
import {MockDirectStoreMuxer} from '../testing/test-storage.js';
import {CRDTEntityTypeRecord, Identified, CRDTEntity, EntityOpTypes} from '../../crdt/crdt-entity.js';
import {StorageProxyMuxer} from '../storage-proxy-muxer.js';
import {DirectStoreMuxer} from '../direct-store-muxer.js';
import {EntityHandleFactory} from '../entity-handle-factory.js';
import {ProxyMessageType, Store} from '../store.js';
import {assert} from '../../../platform/chai-web.js';
import {CRDTSingleton} from '../../crdt/crdt-singleton.js';
import {Entity} from '../../entity.js';
import {ArcId} from '../../id.js';
import {ReferenceModeStorageKey} from '../reference-mode-storage-key.js';
import {VolatileStorageKey} from '../drivers/volatile.js';
import {Loader} from '../../../platform/loader.js';
import {TestVolatileMemoryProvider} from '../../testing/test-volatile-memory-provider.js';
import {Runtime} from '../../runtime.js';
import {CRDTMuxEntity, handleForStore, storeType, CRDTReferenceSingleton, CRDTEntitySingleton} from '../storage.js';
import {Reference} from '../../reference.js';


describe('entity handle factory', () => {
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
    fooEntity1CRDT.applyOperation({type: EntityOpTypes.Set, field: 'value', value: {id: 'Text', value: 'Text'}, actor: 'me', clock: {'me': 1}});

    const fooEntity2 = new fooEntityClass({value: 'OtherText'});
    const fooMuxId2 = 'fooMuxId2';
    Entity.identify(fooEntity2, fooMuxId2, null);

    const fooEntity2CRDT = new CRDTEntity({value: new CRDTSingleton<{id: string, value: string}>()}, {});
    fooEntity2CRDT.applyOperation({type: EntityOpTypes.Set, field: 'value', value: {id: 'Text', value: 'OtherText'}, actor: 'me', clock: {'me': 1}});

    const mockDirectStoreMuxer = new MockDirectStoreMuxer<CRDTMuxEntity>();
    const storageProxyMuxer = new StorageProxyMuxer(mockDirectStoreMuxer as DirectStoreMuxer<Identified, Identified, CRDTMuxEntity>, new MuxType(fooEntityType), mockDirectStoreMuxer.storageKey.toString());
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
    recipe.handles[1].type.maybeEnsureResolved();
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
    const arc = runtime.newArc('test', storageKeyPrefix);
    const recipe = manifest.recipes[0];
    const result = Entity.createEntityClass(manifest.findSchemaByName('Result'), null);

    const refModeStore = await arc.createStore(
      new SingletonType(result.type),
      undefined,
      'test:1',
      undefined,
      new ReferenceModeStorageKey(new VolatileStorageKey(arc.id, '/handle/input:2'), new VolatileStorageKey(arc.id, 'b'))
    );

    assert.isTrue(recipe.normalize());
    assert.isTrue(recipe.isResolved());
    await arc.instantiate(recipe);
    await arc.idle;

    const handleForEntity = await handleForStore(refModeStore, arc);
    const entity = await handleForEntity.setFromData({value: 'val1'});
    await arc.idle;

    const inputStore = arc.storesById.get('input:1') as Store<CRDTReferenceSingleton>;
    const outputStore = arc.storesById.get('output:1') as Store<CRDTEntitySingleton>;

    const handleForInput = await handleForStore(inputStore, arc);
    await handleForInput.set(new Reference({id: Entity.id(entity), entityStorageKey: refModeStore.storageKey.toString()}, storeType(inputStore).getContainedType(), null));
    await arc.idle;

    const handleForOutput = await handleForStore(outputStore, arc);
    const output = await handleForOutput.fetch();
    assert.equal(output.value, 'val1');
  });
});
