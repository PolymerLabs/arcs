/**
 * @license
 * Copyright (c) 2018 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {assert} from '../../../platform/chai-web.js';
import {Loader} from '../../../platform/loader.js';
import {Manifest} from '../../../runtime/manifest.js';
import {RamDiskStorageDriverProvider} from '../../../runtime/storageNG/drivers/ramdisk.js';
import {TestVolatileMemoryProvider} from '../../../runtime/testing/test-volatile-memory-provider.js';
import {SearchTokensToHandles} from '../../strategies/search-tokens-to-handles.js';
import {StrategyTestHelper} from '../../testing/strategy-test-helper.js';

describe('SearchTokensToHandles', () => {
  let memoryProvider;
  beforeEach(() => {
    memoryProvider = new TestVolatileMemoryProvider();
    RamDiskStorageDriverProvider.register(memoryProvider);
  });
  it('finds local handle by tags', async () => {
    const manifest = (await Manifest.parse(`
      schema Thing
      particle ShowThing &show in 'A.js'
        inThing: reads Thing

      recipe
        search \`show mything\`
        h0: ?
        ShowThing
          inThing: reads h0
      store Things of ![Thing] #mything in ThingsJson
      resource ThingsJson
        start
        {"root": {}, "locations": {}}
    `, {memoryProvider}));

    const arc = StrategyTestHelper.createTestArc(manifest);
    await arc._registerStore(arc.context.stores[0], ['mything']);

    const recipe = manifest.recipes[0];
    assert(recipe.normalize());
    assert(!recipe.isResolved());
    recipe.search.resolveToken('show');

    const strategy = new SearchTokensToHandles(arc);
    const results = await strategy.generate({generated: [{result: recipe, score: 1}], terminal: []});

    assert.lengthOf(results, 1);
    const result = results[0].result;
    assert.isTrue(result.isResolved());
    assert.strictEqual('use', result.handles[0].fate);
  });

  it('finds remote handle by tags', async () => {
    const loader = new Loader();
    const storeManifest = (await Manifest.parse(`
import 'src/runtime/tests/artifacts/test-particles.manifest'
store Things of Foo #mything in ThingsJson
store Things of [Foo] #manythings in ThingsJson
  resource ThingsJson
    start
    [{}]
    `, {loader, fileName: '', memoryProvider}));
    const manifest = (await Manifest.parse(`
import 'src/runtime/tests/artifacts/test-particles.manifest'
particle ChooseFoo &choose in 'A.js'
  inFoos: reads [Foo]
  outFoo: writes Foo

recipe
  search \`choose mything from manythings \`
  h0: ?
  h1: ?
  ChooseFoo
    inFoos: reads h0
    outFoo: writes h1
    `, {loader, fileName: '', memoryProvider}));
    const arc = StrategyTestHelper.createTestArc(manifest);
    arc.context.imports.push(storeManifest);
    const recipe = manifest.recipes[0];
    assert(recipe.normalize());
    assert(!recipe.isResolved());
    recipe.search.resolveToken('choose');
    const strategy = new SearchTokensToHandles(arc);
    const results = await strategy.generate({generated: [{result: recipe, score: 1}], terminal: []});

    assert.lengthOf(results, 1);
    const result = results[0].result;
    assert.isTrue(result.isResolved());
    assert.lengthOf(result.handles, 2);
    assert.strictEqual('map', result.handles[0].fate);
    assert.strictEqual('copy', result.handles[1].fate);
  });
});
