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
import {Arc} from '../../../../../build/runtime/arc.js';
import {Runtime} from '../../../../../build/runtime/runtime.js';
import {SlotTestObserver} from '../../../../../build/runtime/testing/slot-test-observer.js';
import {storageKeyPrefixForTest} from '../../../../../build/runtime/testing/handle-for-test.js';
import {CollectionEntityHandle, CollectionEntityType, handleForStoreInfo} from '../../../../../build/runtime/storage/storage.js';
import {StoreInfo} from '../../../../../build/runtime/storage/store-info.js';
import '../../../../lib/arcs-ui/dist/install-ui-classes.js';

describe('products test', () => {
  const manifestFilename = './shells/tests/artifacts/ProductsTestNg.arcs';

  const verifyFilteredBook = async (arc: Arc) => {
    const booksHandle = arc.activeRecipe.handleConnections.find(hc => hc.isOutput).handle;
    const store = arc.findStoreById(booksHandle.id) as StoreInfo<CollectionEntityType>;
    const handle: CollectionEntityHandle = await handleForStoreInfo(store, arc);
    const list = await handle.toList();
    assert.lengthOf(list, 1);
    assert.strictEqual('Harry Potter', list[0].name);
  };

  it('filters', async () => {
    const runtime = new Runtime();
    runtime.context = await runtime.parseFile(manifestFilename);
  const arc = await runtime.startArc({arcName: 'demo', storageKeyPrefix: storageKeyPrefixForTest(), planName: 'FilterBooks'});
    await arc.idle;
    await verifyFilteredBook(arc);
  });

  it('filters and displays', async () => {
    const runtime = new Runtime();
    runtime.context = await runtime.parseFile(manifestFilename);

    const slotObserver = new SlotTestObserver();
    slotObserver
        .newExpectations()
        .expectRenderSlot('List', 'root')
        .expectRenderSlot('List', 'root')
        .expectRenderSlot('ShowProduct', 'item')
        ;
    const arc = await runtime.startArc({
      arcName: 'demo',
      storageKeyPrefix: storageKeyPrefixForTest(),
      planName: 'FilterAndDisplayBooks',
      slotObserver
    });
    await arc.idle;
    await verifyFilteredBook(arc);
  });

});
