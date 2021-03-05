/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import {assert} from '../../platform/chai-web.js';
import {Loader} from '../../platform/loader.js';
import {Manifest} from '../../runtime/manifest.js';
import {Runtime} from '../../runtime/runtime.js';
import {storageKeyPrefixForTest} from '../../runtime/testing/handle-for-test.js';
import {SlotTestObserver} from '../../runtime/testing/slot-test-observer.js';
import {ReferenceType, SingletonType, EntityType, CollectionType} from '../../types/lib-types.js';
import {Entity} from '../../runtime/entity.js';
import {TestVolatileMemoryProvider} from '../../runtime/testing/test-volatile-memory-provider.js';
import {VolatileStorageKey} from '../../runtime/storage/drivers/volatile.js';
import {Exists} from '../../runtime/storage/drivers/driver.js';
import {Reference} from '../../runtime/reference.js';
import {Arc} from '../../runtime/arc.js';
import {handleForStoreInfo, CollectionEntityType, SingletonEntityType, SingletonReferenceType, CollectionReferenceType} from '../../runtime/storage/storage.js';
import {ReferenceModeStorageKey} from '../../runtime/storage/reference-mode-storage-key.js';
import {StoreInfo} from '../../runtime/storage/store-info.js';
import {MockStorageFrontend} from '../../runtime/storage/testing/test-storage.js';

// Import some service definition files for their side-effects (the services get
// registered automatically).
import '../../services/clock-service.js';
import '../../services/random-service.js';

class TestLoader extends Loader {
  constructor(readonly testDir: string) {
    super();
  }

  resolve(path: string) {
    // The manifest is in the same dir as this test file but the compiled wasm binaries
    // are in language-specific dirs, so we need to adjust the loading path accordingly.
    if (path.endsWith('$module.wasm')) {
      return path.replace('tests/$module.wasm', `${this.testDir}/test-module.wasm`);
    }
    return (path[0] === '$') ? `RESOLVED(${path})` : path;
  }

  clone(): TestLoader {
    return this;
  }
}

const testMap = {
  'C++': 'cpp/tests',
  'Kotlin': '../../javatests/arcs/sdk/wasm',
};

async function createBackingEntity(arc: Arc, referenceType: ReferenceType<EntityType>, id: string, entityData: {}): Promise<[string, Reference]> {
  const referenceModeStorageKey = new ReferenceModeStorageKey(new VolatileStorageKey(arc.id, id+'a'), new VolatileStorageKey(arc.id, id+'b'));
  const baseType = referenceType.getContainedType();
  const referenceModeStore = new StoreInfo({
    id: 'refmode1',
    storageKey: referenceModeStorageKey,
    type: new SingletonType(baseType),
    exists: Exists.MayExist
  });

  const backingHandle1 = await handleForStoreInfo(referenceModeStore, arc);
  const entity = await backingHandle1.setFromData(entityData);
  const entityId = Entity.id(entity);
  const reference = new Reference({id: entityId, entityStorageKey: referenceModeStorageKey.toString()}, referenceType, new MockStorageFrontend());
  return [entityId, reference];
}

Object.entries(testMap).forEach(([testLabel, testDir]) => {
  describe(`wasm tests (${testLabel})`, function() {
    const isKotlin = testLabel === 'Kotlin';
    const isCpp = testLabel === 'C++';

    this.timeout(15000);

    let loader;
    let manifestPromise;
    before(function() {
      if (!global['testFlags'].bazel) {
        this.skip();
      } else {
        loader = new TestLoader(testDir);
        manifestPromise = Manifest.parse(`import 'src/wasm/tests/manifest.arcs'`, {
          loader,
          fileName: process.cwd() + '/manifest.arcs',
          memoryProvider: new TestVolatileMemoryProvider()
        });
      }
    });

    async function setup(planName) {
      const runtime = new Runtime({loader, context: await manifestPromise});
      const slotObserver = new SlotTestObserver();
      const arc = await runtime.startArc({arcName: 'wasm-test', storageKeyPrefix: storageKeyPrefixForTest(), planName, slotObserver});
      await arc.idle;
      const [info] = arc.loadedParticleInfo.values();

      return {arc, stores: info.stores, slotObserver, runtime};
    }

    it('onHandleSync / onHandleUpdate', async () => {
      const {arc, stores} = await setup('HandleSyncUpdateTest');
      const sng = await handleForStoreInfo(stores.get('sng') as StoreInfo<SingletonEntityType>, arc);
      const col = await handleForStoreInfo(stores.get('col') as StoreInfo<CollectionEntityType>, arc);
      const res = await handleForStoreInfo(stores.get('res') as StoreInfo<CollectionEntityType>, arc);

      // onHandleSync: txt = 'sync:<handle-name>:<all-synced>'
      // The order in which handles are synchronized isn't guaranteed, so allow for either result.
      const syncs = (await res.toList()).map(e => e.txt);
      if (syncs[0] === 'sync:sng:false') {
        assert.deepStrictEqual(syncs, ['sync:sng:false', 'sync:col:true', 'sng:null']);
      } else {
        assert.deepStrictEqual(syncs, ['sync:col:false', 'sync:sng:true', 'sng:null']);
      }
      await res.clear();

      // onHandleUpdate: txt = 'update:<handle-name>'; num = data.num or -1 for null/empty
      // The updates order should match the storage calls.
      await sng.set(new sng.entityClass({num: 3}));
      const e = new col.entityClass({num: 7});
      await col.add(e);
      await arc.idle;

      await sng.clear();
      await col.remove(e);
      await arc.idle;

      assert.deepStrictEqual(await res.toList() as {}[], [
        {txt: 'update:sng', num: 3},
        {txt: 'update:col', num: 7},
        {txt: 'update:sng', num: -1},
        {txt: 'update:col', num: -1},
      ]);
    });

    // TODO(sjmiles, #4762): Enable this test.
    it.skip('getTemplate / populateModel / renderSlot', async () => {
      const {arc, stores, slotObserver} = await setup('RenderTest');
      const flags = await handleForStoreInfo(stores.get('flags') as StoreInfo<SingletonEntityType>, arc);

      await flags.setFromData({template: false, model: true});
      await arc.idle;

      await flags.setFromData({template: true, model: false});
      await arc.idle;

      await flags.setFromData({template: true, model: true});
      await arc.idle;

      // TODO(sjmiles): modify slotTestObserver to capture similar information
      // First renderSlot call is initiated by the runtime; remaining ones are triggered by writing
      // to the 'flags' handle.
      // assert.deepStrictEqual(slotComposer.received, [
      //   ['RenderTest', 'root', {template: 'abc', model: {foo: 'bar'}}],
      //   ['RenderTest', 'root', {model: {foo: 'bar'}}],
      //   ['RenderTest', 'root', {template: 'abc'}],
      //   ['RenderTest', 'root', {template: 'abc', model: {foo: 'bar'}}]
      // ]);
    });

    // TODO(sjmiles, #4762): Enable this test.
    it.skip('autoRender', async () => {
      const {arc, stores, slotObserver} = await setup('AutoRenderTest');
      const data = await handleForStoreInfo(stores.get('data') as StoreInfo<SingletonEntityType>, arc);

      await data.setFromData({txt: 'update'});
      await arc.idle;

      // TODO(sjmiles): modify slotTestObserver to capture similar information
      // First renderSlot call is initiated by the runtime, before handles are synced.
      // With auto-render enabled, the second call occurs after sync and the third on handle update.
      // assert.deepStrictEqual(slotComposer.received, [
      //   ['AutoRenderTest', 'root', {template: '', model: {}}],
      //   ['AutoRenderTest', 'root', {template: 'initial', model: {}}],
      //   ['AutoRenderTest', 'root', {template: 'update', model: {}}],
      // ]);
    });

    it('fireEvent', async () => {
      const {arc, stores} = await setup('EventsTest');
      const output = await handleForStoreInfo(stores.get('output') as StoreInfo<SingletonEntityType>, arc);

      const particle = arc.activeRecipe.particles[0];
      arc.peh.sendEvent(particle, 'root', {handler: 'icanhazclick', data: {info: 'fooBar'}});
      await arc.idle;

      assert.deepStrictEqual(await output.fetch() as {}, {txt: 'event:root:icanhazclick:fooBar'});
    });

    it('serviceRequest / serviceResponse / resolveUrl', async () => {
      const {arc, stores} = await setup('ServicesTest');
      const output = await handleForStoreInfo(stores.get('output') as StoreInfo<CollectionEntityType>, arc);

      const results = await output.toList();
      assert.lengthOf(results, 4);

      const resolve = results.shift();
      assert.deepStrictEqual(resolve as {}, {call: 'resolveUrl', tag: '', payload: 'RESOLVED($resolve-me)'});

      for (const tag of ['first', 'second']) {
        const random = results.shift();
        assert.strictEqual(random.call, 'random.next');
        assert.strictEqual(random.tag, tag);
        assert.match(random.payload, /^value:0\.[0-9]+;$/);  // eg. 'value:0.33731562467426324;'
      }

      const clock = results.shift();
      assert.strictEqual(clock.call, 'clock.now');
      assert.strictEqual(clock.tag, '');
      assert.match(clock.payload, /^value:20[0-9]{2}-[0-9]{2}-[0-9]{2};$/);  // eg. 'value:2019-11-07;'
    });

    // Some C++ wasm tests print out lists of test cases, and it is much more readable if these
    // can be printed after the main test name.
    function prefix(title, fn) {
      it(title, async () => {
        if (isCpp) {
          console.log('    »', title);
        }
        await fn();
      });
    }

    prefix('entity class API', async () => {
      const {arc, stores} = await setup('EntityClassApiTest');
      const errHandle = await handleForStoreInfo(stores.get('errors') as StoreInfo<CollectionEntityType>, arc);
      const errors = (await errHandle.toList()).map(e => e.msg);
      if (errors.length > 0) {
        assert.fail(`${errors.length} errors found:\n${errors.join('\n')}`);
      }
    });

    prefix('special schema fields', async () => {
      const {arc, stores} = await setup('SpecialSchemaFieldsTest');
      const errHandle = await handleForStoreInfo(stores.get('errors') as StoreInfo<CollectionEntityType>, arc);
      const errors = (await errHandle.toList()).map(e => e.msg);
      if (errors.length > 0) {
        assert.fail(`${errors.length} errors found:\n${errors.join('\n')}`);
      }
    });

    prefix('reference class API', async () => {
      if (isKotlin) {
        // TODO(alxr, #4763): Enable this test.
        return;
      }
      const {arc, stores} = await setup('ReferenceClassApiTest');
      const errHandle = await handleForStoreInfo(stores.get('errors') as StoreInfo<CollectionEntityType>, arc);
      const errors = (await errHandle.toList()).map(e => e.msg);
      if (errors.length > 0) {
        assert.fail(`${errors.length} errors found:\n${errors.join('\n')}`);
      }
    });

    // TODO - check that writing to read-only handles throws and vice versa
    it('singleton storage API', async () => {
      const {arc, stores} = await setup('SingletonApiTest');
      const inHandle = await handleForStoreInfo(stores.get('inHandle') as StoreInfo<SingletonEntityType>, arc);
      const outHandle = await handleForStoreInfo(stores.get('outHandle') as StoreInfo<SingletonEntityType>, arc);
      const ioHandle = await handleForStoreInfo(stores.get('ioHandle') as StoreInfo<SingletonEntityType>, arc);
      const errors = await handleForStoreInfo(stores.get('errors') as StoreInfo<CollectionEntityType>, arc);

      const sendEvent = async handler => {
        await arc.idle;
        arc.peh.sendEvent(arc.activeRecipe.particles[0], 'root', {handler});
        await arc.idle;
      };

      // clear() on out/io with pre-populated stores
      await outHandle.set(new outHandle.entityClass({txt: 'writes'}));
      await ioHandle.set(new ioHandle.entityClass({txt: 'reads writes'}));
      await sendEvent('case1');
      assert.isNull(await outHandle.fetch());
      assert.isNull(await ioHandle.fetch());

      // in.get(), out.set()
      await inHandle.set(new inHandle.entityClass({num: 4}));
      await sendEvent('case2');
      assert.deepStrictEqual(await outHandle.fetch() as {}, {num: 8, txt: ''});

      // io.get()/set()
      await ioHandle.set(new ioHandle.entityClass({num: 4}));
      await sendEvent('case3');
      assert.deepStrictEqual(await ioHandle.fetch() as {}, {num: 12, txt: ''});

      // set() on out/io with pre-cleared stores
      await outHandle.clear();
      await ioHandle.clear();
      await sendEvent('case4');
      assert.deepStrictEqual(await outHandle.fetch() as {}, {num: 0, txt: 'out'});
      assert.deepStrictEqual(await ioHandle.fetch() as {}, {num: 0, txt: 'io'});

      // Check that the null/non-null state of handles was correct.
      assert.deepStrictEqual((await errors.toList()).map(e => e.msg), []);
    });

    it('collection storage API', async () => {
      const {arc, stores} = await setup('CollectionApiTest');
      const inHandle = await handleForStoreInfo(stores.get('inHandle') as StoreInfo<CollectionEntityType>, arc);
      const outHandle = await handleForStoreInfo(stores.get('outHandle') as StoreInfo<CollectionEntityType>, arc);
      const ioHandle = await handleForStoreInfo(stores.get('ioHandle') as StoreInfo<CollectionEntityType>, arc);

      const sendEvent = async handler => {
        await arc.idle;
        arc.peh.sendEvent(arc.activeRecipe.particles[0], 'root', {handler});
        await arc.idle;
      };

      // clear() on out/io with pre-populated stores
      await outHandle.add(new outHandle.entityClass({num: 1}));
      await ioHandle.add(new ioHandle.entityClass({num: 2}));
      await sendEvent('case1');
      assert.isEmpty(await outHandle.toList());
      assert.isEmpty(await ioHandle.toList());

      // in.empty(), in.size(), out.store()
      await inHandle.add(new inHandle.entityClass({num: 3}));
      await sendEvent('case2');
      assert.deepStrictEqual(await outHandle.toList() as {}[], [{flg: false, txt: '', num: 1}]);

      // out.remove() - clears entity stored as the previous result
      await sendEvent('case3');
      assert.isEmpty(await outHandle.toList());

      // in.begin(), in.end() and iterator methods
      // TODO(alxr): Extract out to be a C++ specific test case
      await sendEvent('case4');
      assert.deepStrictEqual(await outHandle.toList() as {}[], [
        {txt: 'num: 3', num: 6, flg: true},
        {txt: 'eq', num: 0, flg: false},
        {txt: 'ne', num: 0, flg: true},
      ]);

      // io.* and ranged iteration
      await ioHandle.add(new ioHandle.entityClass({num: 0, txt: 'x'}));
      await ioHandle.add(new ioHandle.entityClass({num: 1, txt: 'y'}));
      await ioHandle.add(new ioHandle.entityClass({num: 2, txt: 'z'}));
      await outHandle.clear();
      await sendEvent('case5');
      assert.deepStrictEqual(await outHandle.toList() as {}[], [
        {num: 4, txt: '', flg: false},    // store() an entity in addition to the 3 above
        {num: 3, txt: '', flg: false},    // remove() the entity
        {num: 0, txt: 'x', flg: false},   // ranged loop over the 3 entities above, using num to sort
        {num: 1, txt: 'y', flg: false},
        {num: 2, txt: 'z', flg: false},
        {num: 0, txt: '', flg: true},     // clear()
      ]);
    });

    // TODO: writing to reference-typed handles
    it('reference-typed handles - storage', async function() {
      if (isKotlin) {
        // TODO(alxr, #4763): Enable this test.
        this.skip();
      }
      const {arc, stores} = await setup('ReferenceHandlesTest');
      const sng = await handleForStoreInfo(stores.get('sng') as StoreInfo<SingletonReferenceType>, arc);
      const col = await handleForStoreInfo(stores.get('col') as StoreInfo<CollectionReferenceType>, arc);
      const res = await handleForStoreInfo(stores.get('res') as StoreInfo<CollectionEntityType>, arc);

      assert.instanceOf(sng.type, SingletonType);
      assert.instanceOf(sng.type.getContainedType(), ReferenceType);
      assert.instanceOf(col.type.getContainedType(), ReferenceType);

      // onHandleSync tests uninitialised reference handles.
      assert.sameMembers((await res.toList()).map(e => e.txt), [
        's::null',  // handle should just be null
      ]);
      await res.clear();

      // onHandleUpdate tests populated references handles.
      const referenceType = sng.type.getContainedType() as ReferenceType<EntityType>;
      const [entityId1, reference1] = await createBackingEntity(arc, referenceType, 'id1', {num: 6, txt: 'ok'});
      const [entityId2, reference2] = await createBackingEntity(arc, referenceType, 'id2', {num: 7, txt: 'ko'});

      // Singleton
      await sng.set(reference1);
      await arc.idle;
      assert.sameMembers((await res.toList()).map(e => e.txt), [
        `s::before <${entityId1}> !{}`,                      // before dereferencing: contained entity is empty
        `s::after <${entityId1}> {${entityId1}}, num: 6, txt: ok`     // after: entity is populated, ids should match
      ]);
      await res.clear();

      // Collection
      await col.add(reference1);
      await arc.idle;
      assert.sameMembers((await res.toList()).map(e => e.txt), [
        `c::before <${entityId1}> !{}`,                      // ref to same entity as singleton; still empty in this handle
        `c::after <${entityId1}> {${entityId1}}, num: 6, txt: ok`
      ]);
      await res.clear();

      await col.add(reference2);
      await arc.idle;
      assert.sameMembers((await res.toList()).map(e => e.txt), [
        `c::before <${entityId1}> {${entityId1}}, num: 6, txt: ok`,   // already populated by the previous deref
        `c::after <${entityId1}> {${entityId1}}, num: 6, txt: ok`,
        `c::before <${entityId2}> !{}`,
        `c::after <${entityId2}> {${entityId2}}, num: 7, txt: ko`
      ]);
    });

    // TODO: nested references
    it('reference-typed schema fields - storage', async function() {
      if (isKotlin) {
        // TODO(alxr, #4763): Enable this test.
        this.skip();
      }
      const {arc, stores} = await setup('SchemaReferenceFieldsTest');
      const input = await handleForStoreInfo(stores.get('input') as StoreInfo<SingletonEntityType>, arc);
      const output = await handleForStoreInfo(stores.get('output') as StoreInfo<SingletonEntityType>, arc);
      const res = await handleForStoreInfo(stores.get('res') as StoreInfo<CollectionEntityType>, arc);

      // Uninitialised reference fields.
      await input.set(new input.entityClass({num: 5}));
      await arc.idle;

      assert.sameMembers((await res.toList()).map(e => e.txt), [
        'before <> !{}',  // no id or entity data; dereference is a no-op (no 'after' output)
      ]);
      await res.clear();

      // Populated reference fields.
      const entityType = input.type.getEntitySchema().fields.ref.getEntityType();  // yikes
      const refType = new ReferenceType(entityType);
      const [childEntityId, childRef] = await createBackingEntity(arc, refType, 'id1', {val: 'v1'});

      const parentEntity = new input.entityClass({num: 12, ref: childRef});
      await input.set(parentEntity);
      await arc.idle;

      assert.sameMembers((await res.toList()).map(e => e.txt), [
        `before <${childEntityId}> !{}`,            // before dereferencing: contained entity is empty
        `after <${childEntityId}> {${childEntityId}}, val: v1`,  // after dereferencing: entity is populated, ids should match
      ]);

      // The particle clones 'input', binds to a new entity and writes that to 'output'.
      // The ref field should have a storage key, but since this isn't deterministic we need to
      // check for its presence then discard it.
      const data = JSON.parse(JSON.stringify((await output.fetch())));
      assert.isNotEmpty(data.ref.entityStorageKey);
      assert.strictEqual(data.num, 12);
      assert.strictEqual(data.txt, 'xyz');
      assert.strictEqual(data.ref.id, 'foo1');
    });

    it('unicode strings', async () => {
      const {arc, stores} = await setup('UnicodeTest');
      const sng = await handleForStoreInfo(stores.get('sng') as StoreInfo<SingletonEntityType>, arc);
      const col = await handleForStoreInfo(stores.get('col') as StoreInfo<CollectionEntityType>, arc);
      const res = await handleForStoreInfo(stores.get('res') as StoreInfo<CollectionEntityType>, arc);

      // 'pass' tests passthrough of unicode data in entities.
      const pass = 'A:₤⛲ℜ|あ表⏳:Z';
      await sng.set(new sng.entityClass({pass}));
      await col.add(new col.entityClass({pass}));
      await arc.idle;

      // 'src' is set directly by the particle.
      const val = {pass, src: 'åŗċş 🌈'};
      assert.deepStrictEqual(await res.toList() as {}[], [val, val]);
    });

    it('entity slicing', async () => {
      // Entity slicing hasn't been implemented in the storage stack yet, but schema aliasing
      // allows sliced types at the particle level. That means entities will be sent into wasm
      // with the full field set, but only some of those are needed. This test checks that the
      // extra fields are correctly ignored.
      const manifest = await manifestPromise;
      const runtime = new Runtime({loader, context: manifest});
      const arc = runtime.newArc({arcName: 'wasm-test', storageKeyPrefix: storageKeyPrefixForTest()});

      const sliceClass = Entity.createEntityClass(manifest.findSchemaByName('Slice'), null);
      const sngStore = await arc.createStore(new SingletonType(sliceClass.type), undefined, 'test:0');
      const colStore = await arc.createStore(sliceClass.type.collectionOf(), undefined, 'test:1');

      const resType = manifest.findParticleByName('EntitySlicingTest').getConnectionByName('res').type as CollectionType<EntityType>;
      const resStore = await arc.createStore(resType, undefined, 'test:2');

      const sng = await handleForStoreInfo(sngStore, arc);
      await sng.set(new sng.entityClass({num: 159, txt: 'Charlie', flg: true}));

      const col = await handleForStoreInfo(colStore, arc);
      await col.add(new col.entityClass({num: 30, txt: 'Moe', flg: false}));
      await col.add(new col.entityClass({num: 60, txt: 'Larry', flg: false}));
      await col.add(new col.entityClass({num: 90, txt: 'Curly', flg: true}));

      const recipe = arc.context.allRecipes.find(r => r.name === 'EntitySlicingTest');
      recipe.handles[0].mapToStorage(sngStore);
      recipe.handles[1].mapToStorage(colStore);
      recipe.handles[2].mapToStorage(resStore);
      await runtime.allocator.runPlanInArc(arc.id, recipe);
      await arc.idle;

      const res = await handleForStoreInfo(resStore, arc);
      assert.sameMembers((await res.toList()).map(e => e.val), [
        's1:159',
        's2:159,Charlie',
        's3:159,Charlie,true',
        'c1:30',
        'c1:60',
        'c1:90',
        'c2:30,Moe',
        'c2:60,Larry',
        'c2:90,Curly',
        'c3:30,Moe,false',
        'c3:60,Larry,false',
        'c3:90,Curly,true',
      ]);
    });

    it('onFirstStart() Wasm', async function() {
      // TODO(heimlich, 4798) implement in C++
      if (isCpp) {
        this.skip();
      }

      const {arc, stores, runtime} = await setup('OnFirstStartTest');
      const fooHandle = await handleForStoreInfo(stores.get('fooHandle') as StoreInfo<SingletonEntityType>, arc);

      assert.deepStrictEqual(await fooHandle.fetch() as {}, {txt: 'Created!'});

      const serialization = await arc.serialize();
      arc.dispose();

      const manifest = await manifestPromise;

      const {driverFactory, storageService, storageKeyParser} = runtime;
      const arc2 = await runtime.allocator.deserialize({serialization, fileName: ''});
      //await Arc.deserialize({serialization, loader, fileName: '', context: manifest, storageService, driverFactory, storageKeyParser});
      await arc2.idle;

      const fooClass = Entity.createEntityClass(manifest.findSchemaByName('FooHandle'), null);
      const fooHandle2 = await handleForStoreInfo(arc2.stores.find(StoreInfo.isSingletonEntityStore), arc);
      assert.deepStrictEqual(await fooHandle2.fetch(), new fooClass({txt: 'Not created!'}));

    });

    it('multiple handles onUpdate', async function() {
      if (isCpp) {
        this.skip();
      }
      const {arc, stores} = await setup('CombineUpdatesTest');
      const handle1 = await handleForStoreInfo(stores.get('handle1') as StoreInfo<SingletonEntityType>, arc);
      const handle2 = await handleForStoreInfo(stores.get('handle2') as StoreInfo<CollectionEntityType>, arc);
      const handle3 = await handleForStoreInfo(stores.get('handle3') as StoreInfo<SingletonEntityType>, arc);
      const handle4 = await handleForStoreInfo(stores.get('handle4') as StoreInfo<SingletonEntityType>, arc);
      const handle5 = await handleForStoreInfo(stores.get('handle5') as StoreInfo<SingletonEntityType>, arc);
      const handle6 = await handleForStoreInfo(stores.get('handle6') as StoreInfo<SingletonEntityType>, arc);
      const handle7 = await handleForStoreInfo(stores.get('handle7') as StoreInfo<SingletonEntityType>, arc);
      const handle8 = await handleForStoreInfo(stores.get('handle8') as StoreInfo<SingletonEntityType>, arc);
      const handle9 = await handleForStoreInfo(stores.get('handle9') as StoreInfo<SingletonEntityType>, arc);
      const handle10 = await handleForStoreInfo(stores.get('handle10') as StoreInfo<SingletonEntityType>, arc);

      await handle1.set(new handle1.entityClass({num: 1.0}));
      await handle2.add(new handle2.entityClass({num: 1.0}));
      await handle3.set(new handle3.entityClass({num3: 1.0}));
      await handle4.set(new handle4.entityClass({num4: 1.0}));
      await handle5.set(new handle5.entityClass({num5: 1.0}));
      await handle6.set(new handle6.entityClass({num6: 1.0}));
      await handle7.set(new handle7.entityClass({num7: 1.0}));
      await handle8.set(new handle8.entityClass({num8: 1.0}));
      await handle9.set(new handle9.entityClass({num9: 1.0}));
      await handle10.set(new handle10.entityClass({num10: 1.0}));

      const errHandle = await handleForStoreInfo(stores.get('errors') as StoreInfo<CollectionEntityType>, arc);

      const sendEvent = async handler => {
        await arc.idle;
        arc.peh.sendEvent(arc.activeRecipe.particles[0], 'root', {handler});
        await arc.idle;
      };

      await sendEvent('checkEvents');

      const errors = (await errHandle.toList()).map(e => e.msg);

      const expectedErrors = [
        `Single Handle OnUpdate called 1 times.`,
        `Calling combineUpdates with 2 Handles called 2 times.`,
        `Calling combineUpdates with 2 Handles called 2 times.`,
        `Calling combineUpdates with 3 Handles called 3 times.`,
        `Calling combineUpdates with 4 Handles called 4 times.`,
        `Calling combineUpdates with 5 Handles called 5 times.`,
        `Calling combineUpdates with 6 Handles called 6 times.`,
        `Calling combineUpdates with 7 Handles called 7 times.`,
        `Calling combineUpdates with 8 Handles called 8 times.`,
        `Calling combineUpdates with 9 Handles called 9 times.`,
        `Calling combineUpdates with 10 Handles called 10 times.`,
      ];
      assert.deepStrictEqual(errors, expectedErrors);
    });
  });
});
