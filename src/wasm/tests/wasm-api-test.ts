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
import {RozSlotComposer} from '../../runtime/testing/fake-slot-composer.js';
import {singletonHandleForTest, collectionHandleForTest} from '../../runtime/testing/handle-for-test.js';
import {RuntimeCacheService} from '../../runtime/runtime-cache.js';
import {VolatileCollection, VolatileSingleton, VolatileStorage} from '../../runtime/storage/volatile-storage.js';
import {assertThrowsAsync} from '../../testing/test-util.js';
import {ReferenceType} from '../../runtime/type.js';
import {Entity} from '../../runtime/entity.js';

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

Object.entries(testMap).forEach(([testLabel, testDir]) => {
  describe(`wasm tests (${testLabel})`, () => {
    const isKotlin = testLabel === 'Kotlin';
    const isCpp = testLabel === 'C++';

    let loader;
    let manifestPromise;
    before(function() {
      if (!global['testFlags'].bazel) {
        this.skip();
      } else {
        loader = new TestLoader(testDir);
        VolatileStorage.setStorageCache(new RuntimeCacheService());
        manifestPromise = Manifest.parse(`import 'src/wasm/tests/manifest.arcs'`,
                                         {loader, fileName: process.cwd() + '/manifest.arcs'});
      }
    });

    async function setup(recipeName) {
      const runtime = new Runtime({loader, composerClass: RozSlotComposer, context: await manifestPromise});
      const arc = runtime.newArc('wasm-test', 'volatile://');

      const recipe = arc.context.allRecipes.find(r => r.name === recipeName);
      if (!recipe) {
        throw new Error(`Test recipe '${recipeName}' not found`);
      }
      recipe.normalize();
      await arc.instantiate(recipe);
      await arc.idle;

      const [info] = arc.loadedParticleInfo.values();
      return {arc, stores: info.stores, slotComposer: arc.pec.slotComposer as RozSlotComposer};
    }

    it('onHandleSync / onHandleUpdate', async () => {
      const {arc, stores} = await setup('HandleSyncUpdateTest');
      const sng = await singletonHandleForTest(arc, stores.get('sng'));
      const col = await collectionHandleForTest(arc, stores.get('col'));
      const res = await collectionHandleForTest(arc, stores.get('res'));

      // onHandleSync: txt = 'sync:<handle-name>:<all-synced>'
      // The order in which handles are synchronized isn't guaranteed, so allow for either result.
      const syncs = (await res.toList()).map(e => e.txt);
      if (syncs[0] === 'sync:sng:false') {
        assert.deepStrictEqual(syncs, ['sync:sng:false', 'sync:col:true']);
      } else {
        assert.deepStrictEqual(syncs, ['sync:col:false', 'sync:sng:true']);
      }
      await res.clear();

      await sng.set(new sng.entityClass({num: 3}));
      await col.add(new col.entityClass({num: 7}));
      await arc.idle;

      // onHandleUpdate: txt = 'update:<handle-name>'; num = data.num
      // The updates order should match the set() calls above.
      assert.deepStrictEqual(await res.toList(), [{txt: 'update:sng', num: 3}, {txt: 'update:col', num: 7}]);
    });

    it('getTemplate / populateModel / renderSlot', async () => {
      const {arc, stores, slotComposer} = await setup('RenderTest');
      const flags = await singletonHandleForTest(arc, stores.get('flags'));

      await flags.set(new flags.entityClass({template: false, model: true}));
      await arc.idle;

      await flags.set(new flags.entityClass({template: true, model: false}));
      await arc.idle;

      await flags.set(new flags.entityClass({template: true, model: true}));
      await arc.idle;

      // First renderSlot call is initiated by the runtime; remaining ones are triggered by writing
      // to the 'flags' handle.
      assert.deepStrictEqual(slotComposer.received, [
        ['RenderTest', 'root', {template: 'abc', model: {foo: 'bar'}}],
        ['RenderTest', 'root', {model: {foo: 'bar'}}],
        ['RenderTest', 'root', {template: 'abc'}],
        ['RenderTest', 'root', {template: 'abc', model: {foo: 'bar'}}]
      ]);
    });

    it('autoRender', async () => {
      const {arc, stores, slotComposer} = await setup('AutoRenderTest');
      const data = await singletonHandleForTest(arc, stores.get('data'));

      await data.set(new data.entityClass({txt: 'update'}));
      await arc.idle;

      // First renderSlot call is initiated by the runtime, before handles are synced.
      // With auto-render enabled, the second call occurs after sync and the third on handle update.
      assert.deepStrictEqual(slotComposer.received, [
        ['AutoRenderTest', 'root', {template: '', model: {}}],
        ['AutoRenderTest', 'root', {template: 'initial', model: {}}],
        ['AutoRenderTest', 'root', {template: 'update', model: {}}],
      ]);
    });

    it('fireEvent', async () => {
      const {arc, stores, slotComposer} = await setup('EventsTest');
      const output = await singletonHandleForTest(arc, stores.get('output'));

      const particle = slotComposer.consumers[0].consumeConn.particle;
      arc.pec.sendEvent(particle, 'root', {handler: 'icanhazclick', data: {info: 'fooBar'}});
      await arc.idle;

      assert.deepStrictEqual(await output.get(), {txt: 'event:root:icanhazclick:fooBar'});
    });

    it('serviceRequest / serviceResponse / resolveUrl', async () => {
      const {arc, stores} = await setup('ServicesTest');
      const output = await collectionHandleForTest(arc, stores.get('output'));

      const results = await output.toList();
      assert.lengthOf(results, 4);

      const resolve = results.shift();
      assert.deepStrictEqual(resolve, {call: 'resolveUrl', tag: '', payload: 'RESOLVED($resolve-me)'});

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
      const errHandle = await collectionHandleForTest(arc, stores.get('errors'));
      const errors = (await errHandle.toList()).map(e => e.msg);
      if (errors.length > 0) {
        assert.fail(`${errors.length} errors found:\n${errors.join('\n')}`);
      }
    });

    prefix('special schema fields', async () => {
      const {arc, stores} = await setup('SpecialSchemaFieldsTest');
      const errHandle = await collectionHandleForTest(arc, stores.get('errors'));
      const errors = (await errHandle.toList()).map(e => e.msg);
      if (errors.length > 0) {
        assert.fail(`${errors.length} errors found:\n${errors.join('\n')}`);
      }
    });

    prefix('reference class API', async () => {
      // TODO(alxr): Remove when tests are ready
      if (isKotlin) {
        return;
      }
      const {arc, stores} = await setup('ReferenceClassApiTest');
      const errHandle = await collectionHandleForTest(arc, stores.get('errors'));
      const errors = (await errHandle.toList()).map(e => e.msg);
      if (errors.length > 0) {
        assert.fail(`${errors.length} errors found:\n${errors.join('\n')}`);
      }
    });

    // TODO - check that writing to read-only handles throws and vice versa
    it('singleton storage API', async () => {
      const {arc, stores} = await setup('SingletonApiTest');
      const inHandle = await singletonHandleForTest(arc, stores.get('inHandle'));
      const outHandle = await singletonHandleForTest(arc, stores.get('outHandle'));
      const ioHandle = await singletonHandleForTest(arc, stores.get('ioHandle'));

      const sendEvent = async handler => {
        await arc.idle;
        arc.pec.sendEvent(arc.pec.slotComposer.consumers[0].consumeConn.particle, 'root', {handler});
        await arc.idle;
      };

      // clear() on out/io with pre-populated stores
      await outHandle.set(new outHandle.entityClass({txt: 'writes'}));
      await ioHandle.set(new ioHandle.entityClass({txt: 'reads writes'}));
      await sendEvent('case1');
      assert.isNull(await outHandle.get());
      assert.isNull(await ioHandle.get());

      // in.get(), out.set()
      await inHandle.set(new inHandle.entityClass({num: 4}));
      await sendEvent('case2');
      assert.deepStrictEqual(await outHandle.get(), {num: 8, txt: ''});

      // io.get()/set()
      await ioHandle.set(new ioHandle.entityClass({num: 4}));
      await sendEvent('case3');
      assert.deepStrictEqual(await ioHandle.get(), {num: 12, txt: ''});
    });

    it('collection storage API', async () => {
      const {arc, stores} = await setup('CollectionApiTest');
      const inHandle = await collectionHandleForTest(arc, stores.get('inHandle'));
      const outHandle = await collectionHandleForTest(arc, stores.get('outHandle'));
      const ioHandle = await collectionHandleForTest(arc, stores.get('ioHandle'));

      const sendEvent = async handler => {
        await arc.idle;
        arc.pec.sendEvent(arc.pec.slotComposer.consumers[0].consumeConn.particle, 'root', {handler});
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
      assert.deepStrictEqual(await outHandle.toList(), [{flg: false, txt: '', num: 1}]);

      // out.remove() - clears entity stored as the previous result
      await sendEvent('case3');
      assert.isEmpty(await outHandle.toList());

      // in.begin(), in.end() and iterator methods
      // TODO(alxr): Extract out to be a C++ specific test case
      await sendEvent('case4');
      assert.deepStrictEqual(await outHandle.toList(), [
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
      assert.deepStrictEqual(await outHandle.toList(), [
        {num: 4, txt: '', flg: false},    // store() an entity in addition to the 3 above
        {num: 3, txt: '', flg: false},    // remove() the entity
        {num: 0, txt: 'x', flg: false},   // ranged loop over the 3 entities above, using num to sort
        {num: 1, txt: 'y', flg: false},
        {num: 2, txt: 'z', flg: false},
        {num: 0, txt: '', flg: true},     // clear()
      ]);
    });

    // TODO: writing to reference-typed handles
    // TODO: convert to the new storage access pattern (ie. using *HandleForTest and handle.entityClass)
    it('reference-typed handles', async () => {
      // TODO(alxr): Remove when tests are ready
      if (isKotlin) {
        return;
      }
      const {arc, stores} = await setup('ReferenceHandlesTest');
      const sng = stores.get('sng') as VolatileSingleton;
      const col = stores.get('col') as VolatileCollection;
      const res = stores.get('res') as VolatileCollection;
      assert.instanceOf(sng.type, ReferenceType);
      assert.instanceOf(col.type.getContainedType(), ReferenceType);

      // onHandleSync tests uninitialised reference handles.
      assert.sameMembers((await res.toList()).map(e => e.rawData.txt), [
        's::empty <> !{}',  // no id or entity data; dereference is a no-op
      ]);
      await res.clear();

      // onHandleUpdate tests populated references handles.
      const volatileEngine = arc.storageProviderFactory._storageForKey('volatile') as VolatileStorage;
      const backingStore = await volatileEngine.baseStorageFor(sng.type, volatileEngine.baseStorageKey(sng.type));
      await backingStore.store({id: 'id1', rawData: {num: 6, txt: 'ok'}}, ['key1']);
      await backingStore.store({id: 'id2', rawData: {num: 7, txt: 'ko'}}, ['key2']);
      const storageKey = backingStore.storageKey;

      // Singleton
      await sng.set({id: 'id1', storageKey});
      await arc.idle;
      assert.sameMembers((await res.toList()).map(e => e.rawData.txt), [
        's::before <id1> !{}',                      // before dereferencing: contained entity is empty
        's::after <id1> {id1}, num: 6, txt: ok'     // after: entity is populated, ids should match
      ]);
      await res.clear();

      // Collection
      await col.store({id: 'id1', storageKey}, ['key1a']);
      await arc.idle;
      assert.sameMembers((await res.toList()).map(e => e.rawData.txt), [
        'c::before <id1> !{}',                      // ref to same entity as singleton; still empty in this handle
        'c::after <id1> {id1}, num: 6, txt: ok'
      ]);
      await res.clear();

      await col.store({id: 'id2', storageKey}, ['key2a']);
      await arc.idle;
      assert.sameMembers((await res.toList()).map(e => e.rawData.txt), [
        'c::before <id1> {id1}, num: 6, txt: ok',   // already populated by the previous deref
        'c::after <id1> {id1}, num: 6, txt: ok',
        'c::before <id2> !{}',
        'c::after <id2> {id2}, num: 7, txt: ko'
      ]);
    });

    // TODO: nested references
    // TODO: convert to the new storage access pattern (ie. using *HandleForTest and handle.entityClass)
    it('reference-typed schema fields', async () => {
      // TODO(alxr): Remove when tests are ready
      if (isKotlin) {
        return;
      }
      const {arc, stores} = await setup('SchemaReferenceFieldsTest');
      const input = stores.get('input') as VolatileSingleton;
      const output = stores.get('output') as VolatileSingleton;
      const res = stores.get('res') as VolatileCollection;

      // onHandleSync tests uninitialised reference fields.
      assert.sameMembers((await res.toList()).map(e => e.rawData.txt), [
        'empty <> !{}',  // no id or entity data; dereference is a no-op
      ]);
      await res.clear();

      // onHandleUpdate tests populated reference fields.
      const refType = input.type.getEntitySchema().fields.ref.schema.model;  // yikes
      const volatileEngine = arc.storageProviderFactory._storageForKey('volatile') as VolatileStorage;
      const backingStore = await volatileEngine.baseStorageFor(refType, volatileEngine.baseStorageKey(refType));
      await backingStore.store({id: 'id1', rawData: {val: 'v1'}}, ['k1']);

      await input.set({id: 'i1', rawData: {num: 12, ref: {id: 'id1', storageKey: backingStore.storageKey}}});
      await arc.idle;

      assert.sameMembers((await res.toList()).map(e => e.rawData.txt), [
        'before <id1> !{}',            // before dereferencing: contained entity is empty
        'after <id1> {id1}, val: v1',  // after dereferencing: entity is populated, ids should match
      ]);

      // The particle clones 'input', binds to a new entity and writes that to 'output'.
      // The ref field should have a storage key, but since this isn't deterministic we need to
      // check for its presence then discard it.
      const data = JSON.parse(JSON.stringify((await output.get()).rawData));
      assert.isNotEmpty(data.ref.storageKey);
      delete data.ref.storageKey;
      assert.deepStrictEqual(data, {num: 12, txt: 'xyz', ref: {id: 'foo1'}});
    });

    it('unicode strings', async () => {
      const {arc, stores} = await setup('UnicodeTest');
      const sng = await singletonHandleForTest(arc, stores.get('sng'));
      const col = await collectionHandleForTest(arc, stores.get('col'));
      const res = await collectionHandleForTest(arc, stores.get('res'));

      // 'pass' tests passthrough of unicode data in entities.
      const pass = 'A:₤⛲ℜ|あ表⏳:Z';
      await sng.set(new sng.entityClass({pass}));
      await col.add(new col.entityClass({pass}));
      await arc.idle;

      // 'src' is set directly by the particle.
      const val = {pass, src: 'åŗċş 🌈'};
      assert.deepStrictEqual(await res.toList(), [val, val]);
    });

    it('entity slicing', async () => {
      // Entity slicing hasn't been implemented in the storage stack yet, but schema aliasing
      // allows sliced types at the particle level. That means entities will be sent into wasm
      // with the full field set, but only some of those are needed. This test checks that the
      // extra fields are correctly ignored.
      const manifest = await manifestPromise;
      const runtime = new Runtime({loader, composerClass: RozSlotComposer, context: manifest});
      const arc = runtime.newArc('wasm-test', 'volatile://');

      const sliceClass = Entity.createEntityClass(manifest.findSchemaByName('Slice'), null);
      const sngStore = await arc.createStore(sliceClass.type, undefined, 'test:0');
      const colStore = await arc.createStore(sliceClass.type.collectionOf(), undefined, 'test:1');

      const resType = manifest.findParticleByName('EntitySlicingTest').getConnectionByName('res').type;
      const resStore = await arc.createStore(resType, undefined, 'test:2');

      const sng = await singletonHandleForTest(arc, sngStore);
      await sng.set(new sng.entityClass({num: 159, txt: 'Charlie', flg: true}));

      const col = await collectionHandleForTest(arc, colStore);
      await col.add(new col.entityClass({num: 30, txt: 'Moe', flg: false}));
      await col.add(new col.entityClass({num: 60, txt: 'Larry', flg: false}));
      await col.add(new col.entityClass({num: 90, txt: 'Curly', flg: true}));

      const recipe = arc.context.allRecipes.find(r => r.name === 'EntitySlicingTest');
      recipe.handles[0].mapToStorage(sngStore);
      recipe.handles[1].mapToStorage(colStore);
      recipe.handles[2].mapToStorage(resStore);
      recipe.normalize();
      await arc.instantiate(recipe);
      await arc.idle;

      const res = await collectionHandleForTest(arc, resStore);
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
  });
});
