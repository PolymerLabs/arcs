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
import {Loader} from '../../../runtime/loader.js';
import {Manifest} from '../../../runtime/manifest.js';
import {Runtime} from '../../../runtime/runtime.js';
import {RozSlotComposer} from '../../../runtime/testing/fake-slot-composer.js';
import {VolatileStorage, VolatileSingleton, VolatileCollection} from '../../../runtime/storage/volatile-storage.js';
import {assertThrowsAsync} from '../../../runtime/testing/test-util.js';
import {ReferenceType} from '../../../runtime/type.js';

// Import some service definition files for their side-effects (the services get
// registered automatically).
import '../../../services/clock-service.js';
import '../../../services/random-service.js';

const schemasFile = 'src/wasm/cpp/tests/schemas.arcs';
const buildDir = 'src/wasm/cpp/tests';

class TestLoader extends Loader {
  resolve(path: string) {
    return (path[0] === '$') ? `RESOLVED(${path})`: path;
  }

  clone(): TestLoader {
    return this;
  }
}

async function setup(manifestString) {
  const loader = new TestLoader();
  const manifest = await Manifest.parse(manifestString, {loader, fileName: process.cwd() + '/input.arcs'});
  const runtime = new Runtime(loader, RozSlotComposer, manifest);
  const arc = runtime.newArc('wasm-test', 'volatile://');

  const recipe = arc.context.recipes[0];
  recipe.normalize();
  await arc.instantiate(recipe);
  await arc.idle;

  const [info] = arc.loadedParticleInfo.values();
  return {arc, stores: info.stores, slotComposer: arc.pec.slotComposer as RozSlotComposer};
}

describe('wasm tests (C++)', () => {
  before(function() {
    if (!global['testFlags'].bazel) {
      this.skip();
    }
  });

  it('onHandleSync / onHandleUpdate', async () => {
    const {arc, stores} = await setup(`
      import '${schemasFile}'

      particle HandleSyncUpdateTest in '${buildDir}/test-module.wasm'
        in Data input1
        in Data input2
        out [Data] output

      recipe
        HandleSyncUpdateTest
          input1 <- h1
          input2 <- h2
          output -> h3
      `);
    const input1 = stores.get('input1') as VolatileSingleton;
    const input2 = stores.get('input2') as VolatileSingleton;
    const output = stores.get('output') as VolatileCollection;

    // onHandleSync: txt = 'sync:<handle-name>'; flag = all_synced
    // The order in which handles are synchronized isn't guaranteed, so allow for either result.
    const syncs = (await output.toList()).map(e => e.rawData);
    const expected = ['sync:input1', 'sync:input2'];
    if (syncs[0].txt === expected[0]) {
      assert.deepStrictEqual(syncs, [{txt: expected[0], flg: false}, {txt: expected[1], flg: true}]);
    } else {
      assert.deepStrictEqual(syncs, [{txt: expected[1], flg: false}, {txt: expected[0], flg: true}]);
    }
    await output.clearItemsForTesting();

    await input1.set({id: 'i1', rawData: {num: 3}});
    await input2.set({id: 'i2', rawData: {num: 7}});
    await arc.idle;

    // onHandleUpdate: txt = 'update:<handle-name>'; num = input.num
    // The updates order should match the set() calls above.
    const updates = (await output.toList()).map(e => e.rawData);
    assert.deepStrictEqual(updates, [{txt: 'update:input1', num: 3}, {txt: 'update:input2', num: 7}]);
  });

  it('getTemplate / populateModel / renderSlot', async () => {
    const {arc, stores, slotComposer} = await setup(`
      import '${schemasFile}'

      particle RenderTest in '${buildDir}/test-module.wasm'
        consume root
        in RenderFlags flags

      recipe
        slot 'rootslotid-root' as slot1
        RenderTest
          consume root as slot1
          flags <- h1
      `);
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
    const {arc, stores, slotComposer} = await setup(`
      import '${schemasFile}'

      resource DataResource
        start
        [{"txt": "initial"}]
      store DataStore of Data in DataResource

      particle AutoRenderTest in '${buildDir}/test-module.wasm'
        consume root
        in Data data

      recipe
        copy DataStore as h1
        slot 'rootslotid-root' as slot1
        AutoRenderTest
          consume root as slot1
          data <- h1
      `);
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
    const {arc, stores, slotComposer} = await setup(`
      import '${schemasFile}'

      particle EventsTest in '${buildDir}/test-module.wasm'
        consume root
        out Data output

      recipe
        slot 'rootslotid-root' as slot1
        EventsTest
          consume root as slot1
          output -> h1
      `);
    const output = stores.get('output') as VolatileSingleton;

    const particle = slotComposer.consumers[0].consumeConn.particle;
    arc.pec.sendEvent(particle, 'root', {handler: 'icanhazclick', data: 'ignored'});
    await arc.idle;

    assert.deepStrictEqual((await output.get()).rawData, {txt: 'event:root:icanhazclick'});
  });

  it('serviceRequest / serviceResponse / resolveUrl', async () => {
    const {stores} = await setup(`
      import '${schemasFile}'

      particle ServicesTest in '${buildDir}/test-module.wasm'
        out [ServiceResponse] output

      recipe
        ServicesTest
          output -> h1
      `);
    const output = stores.get('output') as VolatileCollection;

    const results = (await output.toList()).map(e => e.rawData);
    assert.lengthOf(results, 4);

    const resolve = results.shift();
    assert.deepStrictEqual(resolve, {call: 'resolveUrl', payload: 'RESOLVED($resolve-me)'});

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

  // TODO: fix PEC -> host error handling
  it.skip('missing registerHandle', async () => {
    assertThrowsAsync(async () => await setup(`
      import '${schemasFile}'

      particle MissingRegisterHandleTest in '${buildDir}/test-module.wasm'
        in Data input

      recipe
        MissingRegisterHandleTest
          input <- h1
    `), `Wasm particle failed to connect handle 'input'`);
  });

  // Some wasm tests print out lists of test cases, and it is much more readable if these can be
  // printed after the main test name.
  function prefix(title, fn) {
    it(title, async () => {
      console.log('    »', title);
      await fn();
    });
  }

  prefix('entity class API', async () => {
    const {stores} = await setup(`
      import '${schemasFile}'

      particle EntityClassApiTest in '${buildDir}/test-module.wasm'
        out [Data] errors

      recipe
        EntityClassApiTest
          errors -> h1
      `);
    const errStore = stores.get('errors') as VolatileCollection;
    const errors = (await errStore.toList()).map(e => e.rawData.txt);
    if (errors.length > 0) {
      assert.fail(`${errors.length} errors found:\n${errors.join('\n')}`);
    }
  });

  prefix('special schema fields', async () => {
    const {stores} = await setup(`
      import '${schemasFile}'

      particle SpecialSchemaFieldsTest in '${buildDir}/test-module.wasm'
        out [Data] errors

      recipe
        SpecialSchemaFieldsTest
          errors -> h1
      `);
    const errStore = stores.get('errors') as VolatileCollection;
    const errors = (await errStore.toList()).map(e => e.rawData.txt);
    if (errors.length > 0) {
      assert.fail(`${errors.length} errors found:\n${errors.join('\n')}`);
    }
  });

  prefix('reference class API', async () => {
    const {stores} = await setup(`
      import '${schemasFile}'

      particle ReferenceClassApiTest in '${buildDir}/test-module.wasm'
        out [Data] errors

      recipe
        ReferenceClassApiTest
          errors -> h1
      `);
    const errStore = stores.get('errors') as VolatileCollection;
    const errors = (await errStore.toList()).map(e => e.rawData.txt);
    if (errors.length > 0) {
      assert.fail(`${errors.length} errors found:\n${errors.join('\n')}`);
    }
  });

  it('reading from reference-typed handles', async () => {
    const {arc, stores} = await setup(`
      import '${schemasFile}'

      particle InputReferenceHandlesTest in '${buildDir}/test-module.wasm'
        in Reference<Data> sng
        in [Reference<Data>] col
        out [Data] res

      recipe
        InputReferenceHandlesTest
          sng <- handle0
          col <- handle1
          res -> handle2
      `);

    const sng = stores.get('sng') as VolatileSingleton;
    const col = stores.get('col') as VolatileCollection;
    const res = stores.get('res') as VolatileCollection;
    assert.instanceOf(sng.type, ReferenceType);
    assert.instanceOf(col.type.getContainedType(), ReferenceType);

    // onHandleSync tests the behaviour of uninitialised references.
    assert.sameMembers((await res.toList()).map(e => e.rawData.txt), [
      'empty_before <> {}',    // no id or entity data, both before and after dereferencing
      'empty_after <> {}'
    ]);
    await res.clearItemsForTesting();

    // onHandleUpdate tests the behaviour of populated references.
    const volatileEngine = arc.storageProviderFactory._storageForKey('volatile') as VolatileStorage;
    const backingStore = await volatileEngine.baseStorageFor(sng.type, volatileEngine.baseStorageKey(sng.type));
    await backingStore.store({id: 'id1', rawData: {txt: 'ok'}}, ['key1']);
    await backingStore.store({id: 'id2', rawData: {num: 23}}, ['key2']);
    const storageKey = backingStore.storageKey;

    // Singleton
    await sng.set({id: 'id1', storageKey});
    await arc.idle;
    assert.sameMembers((await res.toList()).map(e => e.rawData.txt), [
      's::before <id1> {}',               // before dereferencing: contained entity is empty
      's::after <id1> {id1}, txt: ok'     // after: entity is populated, ids should match
    ]);
    await res.clearItemsForTesting();

    // Collection
    await col.store({id: 'id1', storageKey}, ['key1a']);
    await arc.idle;
    assert.sameMembers((await res.toList()).map(e => e.rawData.txt), [
      'c::before <id1> {}',               // ref to same entity as singleton; still empty in this handle
      'c::after <id1> {id1}, txt: ok'
    ]);
    await res.clearItemsForTesting();

    await col.store({id: 'id2', storageKey}, ['key2a']);
    await arc.idle;
    assert.sameMembers((await res.toList()).map(e => e.rawData.txt), [
      'c::before <id1> {id1}, txt: ok',   // already populated by the previous deref
      'c::after <id1> {id1}, txt: ok',
      'c::before <id2> {}',
      'c::after <id2> {id2}, num: 23'
    ]);
  });

  it('writing to reference-typed handles', async () => {
    const {arc, stores} = await setup(`
      import '${schemasFile}'

      particle OutputReferenceHandlesTest in '${buildDir}/test-module.wasm'
        out Reference<Data> sng
        out [Reference<Data>] col

      recipe
        OutputReferenceHandlesTest
          sng -> handle0
          col -> handle1
      `);

    const sng = stores.get('sng') as VolatileSingleton;
    const col = stores.get('col') as VolatileCollection;
    assert.instanceOf(sng.type, ReferenceType);
    assert.instanceOf(col.type.getContainedType(), ReferenceType);

    assert.deepStrictEqual(await sng.get(), {id: 'idX', rawData: {id: 'idX', storageKey: 'keyX'}});
    assert.sameDeepMembers(await col.toList(), [
      {id: 'idX', rawData: {id: 'idX', storageKey: 'keyX'}},
      {id: 'idY', rawData: {id: 'idY', storageKey: 'keyY'}}
    ]);
  });

  // TODO - check that writing to read-only handles throws and vice versa
  it('singleton storage API', async () => {
    const {arc, stores} = await setup(`
      import '${schemasFile}'

      particle SingletonApiTest in '${buildDir}/test-module.wasm'
        consume root
        in Data inHandle
        out Data outHandle
        inout Data ioHandle

      recipe
        slot 'rootslotid-root' as slot1
        SingletonApiTest
          consume root as slot1
          inHandle <- h1
          outHandle -> h2
          ioHandle = h3
      `);
    const inStore = stores.get('inHandle') as VolatileSingleton;
    const outStore = stores.get('outHandle') as VolatileSingleton;
    const ioStore = stores.get('ioHandle') as VolatileSingleton;

    const sendEvent = async handler => {
      await arc.idle;
      arc.pec.sendEvent(arc.pec.slotComposer.consumers[0].consumeConn.particle, 'root', {handler});
      await arc.idle;
    };

    // clear() on out/io with pre-populated stores
    await outStore.set({id: 'i1', rawData: {txt: 'out'}});
    await ioStore.set({id: 'i2', rawData: {txt: 'inout'}});
    await sendEvent('case1');
    assert.isNull(await outStore.get());
    assert.isNull(await ioStore.get());

    // in.get(), out.set()
    await inStore.set({id: 'i3', rawData: {num: 4}});
    await sendEvent('case2');
    assert.deepStrictEqual((await outStore.get()).rawData, {num: 8});

    // io.get()/set()
    await ioStore.set({id: 'i3', rawData: {num: 4}});
    await sendEvent('case3');
    assert.deepStrictEqual((await ioStore.get()).rawData, {num: 12});
  });

  it('collection storage API', async () => {
    const {arc, stores} = await setup(`
      import '${schemasFile}'

      particle CollectionApiTest in '${buildDir}/test-module.wasm'
        consume root
        in [Data] inHandle
        out [Data] outHandle
        inout [Data] ioHandle

      recipe
        slot 'rootslotid-root' as slot1
        CollectionApiTest
          consume root as slot1
          inHandle <- h1
          outHandle -> h2
          ioHandle = h3
      `);
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
    assert.deepStrictEqual((await outStore.toList()).map(e => e.rawData), [{flg: false, num: 1}]);

    // out.remove() - clears entity stored as the previous result
    await sendEvent('case3');
    assert.isEmpty(await outStore.toList());

    // in.begin(), in.end() and iterator methods
    await sendEvent('case4');
    assert.deepStrictEqual((await outStore.toList()).map(e => e.rawData), [
      {txt: '{id3}, num: 3', num: 6, flg: true},
      {txt: 'eq', flg: false},
      {txt: 'ne', flg: true},
    ]);

    // io.* and ranged iteration
    await ioStore.store({id: 'id4', rawData: {num: 0}}, ['k4']);
    await ioStore.store({id: 'id5', rawData: {num: 1}}, ['k5']);
    await ioStore.store({id: 'id6', rawData: {num: 2}}, ['k6']);
    await outStore.clearItemsForTesting();
    await sendEvent('case5');
    assert.deepStrictEqual((await outStore.toList()).map(e => e.rawData), [
      {num: 4, flg: false},      // store() an entity in addition to the 3 above
      {num: 3},                  // remove() the entity
      {txt: '{id4}, num: 0'},    // ranged loop over the 3 entities above, using num to sort
      {txt: '{id5}, num: 1'},
      {txt: '{id6}, num: 2'},
      {num: 0, flg: true},       // clear()
    ]);
  });
});
