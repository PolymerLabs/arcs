/**
 * @license
 * Copyright (c) 2018 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {assert} from '../../platform/chai-web.js';
import {Manifest} from '../../runtime/manifest.js';
import {Runtime} from '../../runtime/runtime.js';
import {TestVolatileMemoryProvider} from '../../runtime/testing/test-volatile-memory-provider.js';
import {Loader} from '../../platform/loader.js';
import {StrategyTestHelper} from '../../planning/testing/strategy-test-helper.js';
import {RamDiskStorageDriverProvider} from '../../runtime/storage/drivers/ramdisk.js';
import {storageKeyPrefixForTest} from '../../runtime/testing/handle-for-test.js';
import {handleForActiveStore, CollectionEntityType} from '../../runtime/storage/storage.js';
import {StoreInfo} from '../../runtime/storage/store-info.js';

describe('common particles test', () => {
  it('resolves after cloning', async () => {
    const memoryProvider = new TestVolatileMemoryProvider();
    const manifest = await Manifest.parse(`
  schema Thing
    name: Text
    description: Text
    image: URL
    url: URL
    identifier: Text

  particle CopyCollection in 'source/CopyCollection.js'
    input: reads [~a]
    output: writes [~a]

  recipe
    bigthings: map 'bigthings'
    smallthings: map 'smallthings'
    things: create *
    CopyCollection
      input: reads bigthings
      output: writes things
    CopyCollection
      input: reads smallthings
      output: writes things

  resource BigThings
    start
    [
      {"name": "house"},
      {"name": "car"}
    ]
  store Store0 of [Thing] 'bigthings' in BigThings

  resource SmallThings
    start
    [
      {"name": "pen"},
      {"name": "spoon"},
      {"name": "ball"}
    ]
  store Store1 of [Thing] 'smallthings' in SmallThings
    `, {memoryProvider});

    const recipe = manifest.recipes[0];
    const newRecipe = recipe.clone();
    recipe.normalize();
    assert(recipe.isResolved());
    newRecipe.normalize();
    assert(newRecipe.isResolved());
  });


  it('copy handle test', async () => {
    const runtime = new Runtime();
    runtime.context = await runtime.parseFile('./src/tests/particles/artifacts/copy-collection-test.recipes');
    const arc = runtime.getArcById(runtime.allocator.newArc({arcName: 'demo', storageKeyPrefix: storageKeyPrefixForTest()}));

    const suggestions = await StrategyTestHelper.planForArc(runtime, arc);
    assert.lengthOf(suggestions, 1);
    const suggestion = suggestions[0];
    assert.equal(suggestion.descriptionText, 'Copy all things!');

    assert.isEmpty(arc.stores);

    await runtime.allocator.runPlanInArc(arc.id, suggestion.plan);
    await arc.idle;

    const storeInfo = arc.findStoreById(arc.stores[2].id) as StoreInfo<CollectionEntityType>;
    const handle = handleForActiveStore(storeInfo, arc);
    assert.strictEqual((await handle.toList()).length, 5);
  });
});
