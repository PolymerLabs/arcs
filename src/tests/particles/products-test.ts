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
import {Arc} from '../../runtime/arc.js';
import {IdGenerator} from '../../runtime/id.js';
import {Loader} from '../../runtime/loader.js';
import {Manifest} from '../../runtime/manifest.js';
import {Runtime} from '../../runtime/runtime.js';
import {MockSlotComposer} from '../../runtime/testing/mock-slot-composer.js';
import {FakeSlotComposer} from '../../runtime/testing/fake-slot-composer.js';
import {StorageProviderBase} from '../../runtime/storage/storage-provider-base.js';

describe('products test', () => {
  const manifestFilename = './src/tests/particles/artifacts/products-test.recipes';

  const verifyFilteredBook = async (arc) => {
    const booksHandle = arc.activeRecipe.handleConnections.find(hc => hc.isOutput).handle;
    const store = arc.findStoreById(booksHandle.id);
    const list = await store.toList();
    assert.lengthOf(list, 1);
    assert.strictEqual('Harry Potter', list[0].rawData.name);
  };

  it('filters', async () => {
    const loader = new Loader();
    const runtime = new Runtime(loader, FakeSlotComposer, await Manifest.load(manifestFilename, loader));
    const arc = runtime.newArc('demo', 'volatile://');
    const recipe = arc.context.recipes.find(r => r.name === 'FilterBooks');
    assert.isTrue(recipe.normalize() && recipe.isResolved());
    await arc.instantiate(recipe);
    await arc.idle;
    await verifyFilteredBook(arc);
  });

  it('filters and displays', async () => {
    const loader = new Loader();
    const slotComposer = new MockSlotComposer({strict: false});
    const id = IdGenerator.newSession().newArcId('demo');
    const arc = new Arc({
      id,
      storageKey: `volatile://${id.toString()}`,
      loader,
      slotComposer,
      context: await Manifest.load(manifestFilename, loader)
    });
    const recipe = arc.context.recipes.find(r => r.name === 'FilterAndDisplayBooks');
    assert.isTrue(recipe.normalize() && recipe.isResolved());

    slotComposer
        .newExpectations()
          .expectRenderSlot('List', 'root', {contentTypes: ['template']})
          .expectRenderSlot('List', 'root', {contentTypes: ['model'], verify: (content) => {
            const verified = content.model && content.model.hasItems
                && content.model.items['$template'].length > 0
                && 1 === content.model.items.models.length;
            if (verified) {
              // TODO: reaching directly into data objects like this is super dodgy and we should
              // fix. It's particularly bad here as there's no guarantee that the backingStore
              // exists - should await ensureBackingStore() before accessing it.
              const reference = arc._stores[0]['_model'].getValue(content.model.items.models[0].id);
              const store = (arc._stores[0] as StorageProviderBase).backingStore;
              assert.equal(store.storageKey, reference.storageKey);
              assert.equal('Harry Potter', store['_model'].getValue(reference.id).rawData.name);
            }
            return verified;
          }})
          .expectRenderSlot('ShowProduct', 'item', {contentTypes: ['template', 'model']})
          .expectRenderSlot('ItemMultiplexer', 'item', {hostedParticle: 'ShowProduct', verify: (content) => {
            return content.model
                && 1 === content.model.items.length
                && 'Harry Potter' === content.model.items[0].name;
          }});
    await arc.instantiate(recipe);
    await arc.idle;
    await verifyFilteredBook(arc);
  });
});
