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
import {Loader} from '../../platform/loader.js';
import {Arc} from '../../runtime/arc.js';
import {Flags} from '../../runtime/flags.js';
import {IdGenerator} from '../../runtime/id.js';
import {Manifest} from '../../runtime/manifest.js';
import {Runtime} from '../../runtime/runtime.js';
import {SlotComposer} from '../../runtime/slot-composer.js';
import {SlotTestObserver} from '../../runtime/testing/slot-test-observer.js';
import {DriverFactory} from '../../runtime/storageNG/drivers/driver-factory.js';
import {RamDiskStorageDriverProvider} from '../../runtime/storageNG/drivers/ramdisk.js';
import {collectionHandleForTest, storageKeyForTest, storageKeyPrefixForTest} from '../../runtime/testing/handle-for-test.js';
import {TestVolatileMemoryProvider} from '../../runtime/testing/test-volatile-memory-provider.js';

describe('products test', () => {

  beforeEach(() => {
    manifestFilename = Flags.useNewStorageStack ?
      './src/tests/particles/artifacts/ProductsTestNg.arcs' :
      './src/tests/particles/artifacts/products-test.recipes';
  });

  afterEach(() => {
    DriverFactory.clearRegistrationsForTesting();
  });

  let manifestFilename: string;

  const verifyFilteredBook = async (arc: Arc) => {
    const booksHandle = arc.activeRecipe.handleConnections.find(hc => hc.isOutput).handle;
    const store = arc.findStoreById(booksHandle.id);
    const handle = await collectionHandleForTest(arc, store);
    const list = await handle.toList();
    assert.lengthOf(list, 1);
    assert.strictEqual('Harry Potter', list[0].name);
  };

  it('filters', async () => {
    const loader = new Loader();
    const memoryProvider = new TestVolatileMemoryProvider();
    RamDiskStorageDriverProvider.register(memoryProvider);
    const runtime = new Runtime({
        loader,
        context: await Manifest.load(manifestFilename, loader, {memoryProvider}),
        memoryProvider
      });
    const arc = runtime.newArc('demo', storageKeyPrefixForTest());
    const recipe = arc.context.recipes.find(r => r.name === 'FilterBooks');
    assert.isTrue(recipe.normalize() && recipe.isResolved());
    await arc.instantiate(recipe);
    await arc.idle;
    await verifyFilteredBook(arc);
  });

  it('filters and displays', async () => {
    const loader = new Loader();
    const memoryProvider = new TestVolatileMemoryProvider();
    RamDiskStorageDriverProvider.register(memoryProvider);
    const slotComposer = new SlotComposer();
    const id = IdGenerator.newSession().newArcId('demo');
    const arc = new Arc({
      id,
      storageKey: storageKeyForTest(id),
      loader,
      slotComposer,
      context: await Manifest.load(manifestFilename, loader, {memoryProvider})
    });
    const recipe = arc.context.recipes.find(r => r.name === 'FilterAndDisplayBooks');
    assert.isTrue(recipe.normalize() && recipe.isResolved());

    const observer = new SlotTestObserver();
    slotComposer.observeSlots(observer);
    observer
        .newExpectations()
        .expectRenderSlot('List', 'root')
        .expectRenderSlot('List', 'root')
        .expectRenderSlot('ShowProduct', 'item')
        ;
    await arc.instantiate(recipe);
    await arc.idle;
    await verifyFilteredBook(arc);
  });
});
