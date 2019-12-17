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
import {VolatileCollection, VolatileSingleton, VolatileStorage} from '../../runtime/storage/volatile-storage.js';
import {assertThrowsAsync} from '../../testing/test-util.js';
import {ReferenceType} from '../../runtime/type.js';
// Import some service definition files for their side-effects (the services get
// registered automatically).
import '../../services/clock-service.js';
import '../../services/random-service.js';

class TestLoader extends Loader {
  constructor(readonly env: string) {
    super();
  }

  resolve(path: string) {
    // The manifest is in the same dir as this test file but the compiled wasm binaries
    // are in language-specific dirs, so we need to adjust the loading path accordingly.
    if (path.endsWith('$module.wasm')) {
      return path.replace('tests/$module.wasm', `${this.env}/test-module.wasm`);
    }
    return (path[0] === '$') ? `RESOLVED(${path})` : path;
  }

  clone(): TestLoader {
    return this;
  }
}

['cpp/tests', 'kotlin/javatests/arcs'].forEach(env => {
  // Run tests for C++ and Kotlin
  describe(`wasm tests (${env.split('/')[0]})`, () => {

    let loader;
    let manifestPromise;

    before(function() {
      if (!global['testFlags'].bazel) {
        this.skip();
      } else {
        loader = new TestLoader(env);
        manifestPromise = Manifest.parse(`import 'src/wasm/tests/manifest.arcs'`,
                                         {loader, fileName: process.cwd() + '/manifest.arcs'});
      }
    });

    async function setup(recipeName) {
      const runtime = new Runtime(loader, RozSlotComposer, await manifestPromise);
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
      const sng = stores.get('sng') as VolatileSingleton;
      const col = stores.get('col') as VolatileCollection;
      const res = stores.get('res') as VolatileCollection;

      // onHandleSync: txt = 'sync:<handle-name>:<all-synced>'
      // The order in which handles are synchronized isn't guaranteed, so allow for either result.
      const syncs = (await res.toList()).map(e => e.rawData.txt);
      if (syncs[0] === 'sync:sng:false') {
        assert.deepStrictEqual(syncs, ['sync:sng:false', 'sync:col:true']);
      } else {
        assert.deepStrictEqual(syncs, ['sync:col:false', 'sync:sng:true']);
      }
      await res.clearItemsForTesting();

      await sng.set({id: 'i1', rawData: {num: 3}});
      await col.store({id: 'i2', rawData: {num: 7}}, ['k1']);
      await arc.idle;

      // onHandleUpdate: txt = 'update:<handle-name>'; num = data.num
      // The updates order should match the set() calls above.
      const updates = (await res.toList()).map(e => e.rawData);
      assert.deepStrictEqual(updates, [{txt: 'update:sng', num: 3}, {txt: 'update:col', num: 7}]);
    });

    it('getTemplate / populateModel / renderSlot', async () => {
      const {arc, stores, slotComposer} = await setup('RenderTest');
      const flags = stores.get('flags') as VolatileSingleton;

      await flags.set({id: 'i1', rawData: {template: false, model: true}});
      await arc.idle;

      await flags.set({id: 'i2', rawData: {template: true, model: false}});
      await arc.idle;

      await flags.set({id: 'i3', rawData: {template: true, model: true}});
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
      const data = stores.get('data') as VolatileSingleton;

      await data.set({id: 'i1', rawData: {txt: 'update'}});
      await arc.idle;

      // First renderSlot call is initiated by the runtime, before handles are synced.
      // With auto-render enabled, the second call occurs after sync and the third on handle update.
      assert.deepStrictEqual(slotComposer.received, [
        ['AutoRenderTest', 'root', {template: 'empty', model: {}}],
        ['AutoRenderTest', 'root', {template: 'initial', model: {}}],
        ['AutoRenderTest', 'root', {template: 'update', model: {}}],
      ]);
    });

    it('fireEvent', async () => {
      const {arc, stores, slotComposer} = await setup('EventsTest');
      const output = stores.get('output') as VolatileSingleton;

      const particle = slotComposer.consumers[0].consumeConn.particle;
      arc.pec.sendEvent(particle, 'root', {handler: 'icanhazclick', data: {info: 'fooBar'}});
      await arc.idle;

      assert.deepStrictEqual((await output.get()).rawData, {txt: 'event:root:icanhazclick:fooBar'});
    });

    it('serviceRequest / serviceResponse / resolveUrl', async () => {
      const {stores} = await setup('ServicesTest');
      const output = stores.get('output') as VolatileCollection;

      const results = (await output.toList()).map(e => e.rawData);
      assert.lengthOf(results, 4);

      const resolve = results.shift();
      if (env.includes('kotlin')) {
        assert.deepStrictEqual(resolve, {call: 'resolveUrl', tag: '', payload: 'RESOLVED($resolve-me)'});
      } else {
       assert.deepStrictEqual(resolve, {call: 'resolveUrl', payload: 'RESOLVED($resolve-me)'});
      }

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
        if (env.includes('cpp')) {
          console.log('    »', title);
        }
        await fn();
      });
    }

    prefix('entity class API', async () => {
      const {stores} = await setup('EntityClassApiTest');
      const errStore = stores.get('errors') as VolatileCollection;
      const errors = (await errStore.toList()).map(e => e.rawData.msg);
      if (errors.length > 0) {
        assert.fail(`${errors.length} errors found:\n${errors.join('\n')}`);
      }
    });

    prefix('special schema fields', async () => {
      const {stores} = await setup('SpecialSchemaFieldsTest');
      const errStore = stores.get('errors') as VolatileCollection;
      const errors = (await errStore.toList()).map(e => e.rawData.msg);
      if (errors.length > 0) {
        assert.fail(`${errors.length} errors found:\n${errors.join('\n')}`);
      }
    });

    prefix('reference class API', async () => {
      // TODO(alxr): Remove when tests are ready
      if (env.includes('kotlin')) {
        return;
      }
      const {stores} = await setup('ReferenceClassApiTest');
      const errStore = stores.get('errors') as VolatileCollection;
      const errors = (await errStore.toList()).map(e => e.rawData.msg);
      if (errors.length > 0) {
        assert.fail(`${errors.length} errors found:\n${errors.join('\n')}`);
      }
    });

    // TODO - check that writing to read-only handles throws and vice versa
    it('singleton storage API', async () => {
      const {arc, stores} = await setup('SingletonApiTest');
      const inStore = stores.get('inHandle') as VolatileSingleton;
      const outStore = stores.get('outHandle') as VolatileSingleton;
      const ioStore = stores.get('ioHandle') as VolatileSingleton;

      const sendEvent = async handler => {
        await arc.idle;
        arc.pec.sendEvent(arc.pec.slotComposer.consumers[0].consumeConn.particle, 'root', {handler});
        await arc.idle;
      };

      // clear() on out/io with pre-populated stores
      await outStore.set({id: 'i1', rawData: {txt: 'writes'}});
      await ioStore.set({id: 'i2', rawData: {txt: 'reads writes'}});
      await sendEvent('case1');
      assert.isNull(await outStore.get());
      assert.isNull(await ioStore.get());

      // in.get(), out.set()
      await inStore.set({id: 'i3', rawData: {num: 4}});
      await sendEvent('case2');
      if (env.includes('kotlin')) {
       assert.deepStrictEqual((await outStore.get()).rawData, {num: 8, txt: ''});
      } else {
       assert.deepStrictEqual((await outStore.get()).rawData, {num: 8});
      }

      // io.get()/set()
      await ioStore.set({id: 'i3', rawData: {num: 4}});
      await sendEvent('case3');
      if (env.includes('kotlin')) {
       assert.deepStrictEqual((await ioStore.get()).rawData, {num: 12, txt: ''});
      } else {
       assert.deepStrictEqual((await ioStore.get()).rawData, {num: 12});
      }
    });

    it('collection storage API', async () => {
      const {arc, stores} = await setup('CollectionApiTest');
      const inStore = stores.get('inHandle') as VolatileCollection;
      const outStore = stores.get('outHandle') as VolatileCollection;
      const ioStore = stores.get('ioHandle') as VolatileCollection;

      const sendEvent = async handler => {
        await arc.idle;
        arc.pec.sendEvent(arc.pec.slotComposer.consumers[0].consumeConn.particle, 'root', {handler});
        await arc.idle;
      };

      // clear() on out/io with pre-populated stores
      await outStore.store({id: 'id1', rawData: {num: 1}}, ['k1']);
      await ioStore.store({id: 'id2', rawData: {num: 2}}, ['k2']);
      await sendEvent('case1');
      assert.isEmpty(await outStore.toList());
      assert.isEmpty(await ioStore.toList());

      // in.empty(), in.size(), out.store()
      await inStore.store({id: 'id3', rawData: {num: 3}}, ['k3']);
      await sendEvent('case2');
      if (env.includes('kotlin')) {
       assert.deepStrictEqual((await outStore.toList()).map(e => e.rawData), [{flg: false, txt: '', num: 1}]);
      } else {
              assert.deepStrictEqual((await outStore.toList()).map(e => e.rawData), [{flg: false, num: 1}]);
      }

      // out.remove() - clears entity stored as the previous result
      await sendEvent('case3');
      assert.isEmpty(await outStore.toList());

      // in.begin(), in.end() and iterator methods
      // TODO(alxr): Extract out to be a C++ specific test case
      await sendEvent('case4');
      if (env.includes('kotlin')) {
       assert.deepStrictEqual((await outStore.toList()).map(e => e.rawData), [
        {txt: '{id3}, num: 3', num: 6, flg: true},
        {txt: 'eq', num: 0, flg: false},
        {txt: 'ne', num: 0, flg: true},
       ]);
      } else {
       assert.deepStrictEqual((await outStore.toList()).map(e => e.rawData), [
        {txt: '{id3}, num: 3', num: 6, flg: true},
        {txt: 'eq', flg: false},
        {txt: 'ne', flg: true},
       ]);
      }

      // io.* and ranged iteration
      await ioStore.store({id: 'id4', rawData: {num: 0}}, ['k4']);
      await ioStore.store({id: 'id5', rawData: {num: 1}}, ['k5']);
      await ioStore.store({id: 'id6', rawData: {num: 2}}, ['k6']);
      await outStore.clearItemsForTesting();
      await sendEvent('case5');
      if (env.includes('kotlin')) {
       assert.deepStrictEqual((await outStore.toList()).map(e => e.rawData), [
        {num: 4, flg: false, txt: ''},      // store() an entity in addition to the 3 above
        {num: 3, flg: false, txt: ''},                  // remove() the entity
        {txt: '{id4}, num: 0', num: 0, flg: false},    // ranged loop over the 3 entities above, using num to sort
        {txt: '{id5}, num: 1', num: 0, flg: false},
        {txt: '{id6}, num: 2', num: 0, flg: false},
        {num: 0, flg: true, txt: ''},       // clear()
       ]);
      } else {
       assert.deepStrictEqual((await outStore.toList()).map(e => e.rawData), [
        {num: 4, flg: false},      // store() an entity in addition to the 3 above
        {num: 3},                  // remove() the entity
        {txt: '{id4}, num: 0'},    // ranged loop over the 3 entities above, using num to sort
        {txt: '{id5}, num: 1'},
        {txt: '{id6}, num: 2'},
        {num: 0, flg: true},       // clear()
       ]);
      }
    });

    // TODO: writing to reference-typed handles
    it('reference-typed handles', async () => {
      // TODO(alxr): Remove when tests are ready
      if (env.includes('kotlin')) {
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
      await res.clearItemsForTesting();

      // onHandleUpdate tests populated references handles.
      const volatileEngine = arc.storageProviderFactory._storageForKey('volatile') as VolatileStorage;
      const backingStore = await volatileEngine.baseStorageFor(sng.type, volatileEngine.baseStorageKey(sng.type));
      await backingStore.store({id: 'id1', rawData: {txt: 'ok'}}, ['key1']);
      await backingStore.store({id: 'id2', rawData: {num: 23}}, ['key2']);
      const storageKey = backingStore.storageKey;

      // Singleton
      await sng.set({id: 'id1', storageKey});
      await arc.idle;
      assert.sameMembers((await res.toList()).map(e => e.rawData.txt), [
        's::before <id1> !{}',              // before dereferencing: contained entity is empty
        's::after <id1> {id1}, txt: ok'     // after: entity is populated, ids should match
      ]);
      await res.clearItemsForTesting();

      // Collection
      await col.store({id: 'id1', storageKey}, ['key1a']);
      await arc.idle;
      assert.sameMembers((await res.toList()).map(e => e.rawData.txt), [
        'c::before <id1> !{}',              // ref to same entity as singleton; still empty in this handle
        'c::after <id1> {id1}, txt: ok'
      ]);
      await res.clearItemsForTesting();

      await col.store({id: 'id2', storageKey}, ['key2a']);
      await arc.idle;
      assert.sameMembers((await res.toList()).map(e => e.rawData.txt), [
        'c::before <id1> {id1}, txt: ok',   // already populated by the previous deref
        'c::after <id1> {id1}, txt: ok',
        'c::before <id2> !{}',
        'c::after <id2> {id2}, num: 23'
      ]);
    });

    // TODO: nested references
    it('reference-typed schema fields', async () => {
      // TODO(alxr): Remove when tests are ready
      if (env.includes('kotlin')) {
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
      await res.clearItemsForTesting();

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
      const sng = stores.get('sng') as VolatileSingleton;
      const col = stores.get('col') as VolatileCollection;
      const res = stores.get('res') as VolatileCollection;

      // 'pass' tests passthrough of unicode data in entities.
      const pass = 'A:₤⛲ℜ|あ表⏳:Z';
      await sng.set({id: 'i1', rawData: {pass}});
      await col.store({id: 'i2', rawData: {pass}}, ['k1']);
      await arc.idle;

      // 'src' is set directly by the particle.
      const val = {pass, src: 'åŗċş 🌈'};
      assert.deepStrictEqual((await res.toList()).map(e => e.rawData), [val, val]);
    });
  });
});
