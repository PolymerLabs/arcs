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
import {FakeSlotComposer} from '../../../runtime/testing/fake-slot-composer.js';
import {SingletonStorageProvider} from '../../../runtime/storage/storage-provider-base.js';
import * as util from '../../../runtime/testing/test-util.js';

describe.skip('wasm C++ tests', () => {
  it('simple entity passthrough', async () => {
    const loader = new Loader();
    const manifest = await Manifest.parse(`
      import 'build/wasm/cpp/tests/test.manifest'
      recipe
        PassThrough
          input <- h0
          output -> h1
      `, {loader, fileName: process.cwd() + '/input.manifest'});

    const runtime = new Runtime(loader, FakeSlotComposer, manifest);
    const arc = runtime.newArc('wasm-test', 'volatile://');
    const recipe = arc.context.recipes[0];
    recipe.normalize();
    await arc.instantiate(recipe);
    await arc.idle;

    const [info] = arc.loadedParticleInfo.values();
    const input = info.stores.get('input') as SingletonStorageProvider;
    const output = info.stores.get('output') as SingletonStorageProvider;

    const empty = await output.get();
    assert.deepEqual(empty.rawData, {});

    // Set all fields on the input.
    await input.set({id: 'i0', rawData: {num: 12, txt: 'abc', lnk: 'http://def', flg: true}});
    await arc.idle;
    const all = await output.get();
    assert.notEqual(all.id, '', 'output entity should have an id');
    assert.notEqual(all.id, 'i0', 'output id should not be the same as the input');
    assert.deepEqual(all.rawData, {num: 24, txt: 'abc!', lnk: 'http://def#', flg: false});

    // Set some fields on the input.
    await input.set({id: 'i1', rawData: {txt: 'abc', flg: false}});
    await arc.idle;
    const some = await output.get();
    assert.notEqual(some.id, '', 'output entity should have an id');
    assert.notEqual(some.id, 'i1', 'output id should not be the same as the input');
    assert.deepEqual(some.rawData, {txt: 'abc!', flg: true});
  });
});
