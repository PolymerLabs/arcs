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
import {VolatileSingleton, VolatileCollection} from '../../../runtime/storage/volatile-storage.js';
import {assertThrowsAsync} from '../../../runtime/testing/test-util.js';

const schemasFile = 'src/wasm/cpp/tests/schemas.arcs';
const wasmFile = 'build/wasm/cpp/tests/test-module.wasm';

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
  // TODO: https://github.com/PolymerLabs/arcs/issues/3418
  before(function() {
    if (!global['testFlags'].enableWasm) {
      this.skip();
    }
  });

  it('onHandleSync / onHandleUpdate', async () => {
    const {arc, stores} = await setup(`
      import '${schemasFile}'

      particle HandleSyncUpdateTest in '${wasmFile}'
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

      particle RenderTest in '${wasmFile}'
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

      particle AutoRenderTest in '${wasmFile}'
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

      particle EventsTest in '${wasmFile}'
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

      particle ServicesTest in '${wasmFile}'
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

  it('missing registerHandle', async () => {
    assertThrowsAsync(async () => await setup(`
      import '${schemasFile}'

      particle MissingRegisterHandleTest in '${wasmFile}'
        in Data input

      recipe
        MissingRegisterHandleTest
          input <- h1
    `), `Wasm particle failed to connect handle 'input'`);
  });
});
