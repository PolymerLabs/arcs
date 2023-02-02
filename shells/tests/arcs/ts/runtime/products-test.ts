/**
 * @license
 * Copyright (c) 2018 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {assert} from '../../../../../build/platform/chai-web.js';
import {ArcInfo} from '../../../../../build/runtime/arc-info.js';
import {Runtime} from '../../../../../build/runtime/runtime.js';
import {SlotTestObserver} from '../../../../../build/runtime/testing/slot-test-observer.js';
import {storageKeyPrefixForTest} from '../../../../../build/runtime/testing/handle-for-test.js';
import {CollectionEntityHandle, CollectionEntityType} from '../../../../../build/runtime/storage/storage.js';
import {StoreInfo} from '../../../../../build/runtime/storage/store-info.js';
import '../../../../lib/arcs-ui/dist/install-ui-classes.js';

describe('products test', () => {
  const manifestFilename = './shells/tests/artifacts/ProductsTestNg.arcs';

  let runtime: Runtime;
  beforeEach(async () => {
    runtime = new Runtime();
    runtime.context = await runtime.parseFile(manifestFilename);
  });

  const verifyFilteredBook = async (arc: ArcInfo) => {
    const booksHandle = arc.activeRecipe.handleConnections.find(hc => hc.isOutput).handle;
    const store = arc.findStoreById(booksHandle.id) as StoreInfo<CollectionEntityType>;
    const handle: CollectionEntityHandle = await runtime.host.handleForStoreInfo(store, arc);
    const list = await handle.toList();
    assert.lengthOf(list, 1);
    assert.strictEqual('Harry Potter', list[0].name);
  };

  it('filters', async () => {
    const arc = await runtime.allocator.startArc({
      arcName: 'demo',
      storageKeyPrefix: storageKeyPrefixForTest(),
      planName: 'FilterBooks'
    });
    await runtime.getArcById(arc.id).idle;
    await verifyFilteredBook(arc);
  });

  it('filters and displays', async () => {
    const slotObserver = new SlotTestObserver();
    slotObserver
        .newExpectations()
        .expectRenderSlot('List', 'root')
        .expectRenderSlot('List', 'root')
        .expectRenderSlot('ShowProduct', 'item')
        ;
    const arc = await runtime.allocator.startArc({
      arcName: 'demo',
      storageKeyPrefix: storageKeyPrefixForTest(),
      planName: 'FilterAndDisplayBooks',
      slotObserver
    });
    await runtime.getArcById(arc.id).idle;
    await verifyFilteredBook(arc);
  });

});
