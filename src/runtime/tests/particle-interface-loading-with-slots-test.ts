/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {assert} from '../../platform/chai-web.js';
import {Arc} from '../arc.js';
import {ArcId} from '../id.js';
import {Loader} from '../../platform/loader.js';
import {Manifest} from '../manifest.js';
import {SlotComposer} from '../slot-composer.js';
import {SlotTestObserver} from '../testing/slot-test-observer.js';
import {Recipe} from '../recipe/recipe.js';
import {Entity} from '../entity.js';
import {CollectionEntityStore, handleForStore, CollectionEntityHandle} from '../storageNG/storage-ng.js';

describe('particle interface loading with slots', () => {
  async function initializeManifestAndArc(contextContainer?):
    Promise<{manifest: Manifest, recipe: Recipe, observer: SlotTestObserver, arc: Arc}> {
    const loader = new Loader();
    const manifestText = `
      import './src/runtime/tests/artifacts/transformations/test-slots-particles.manifest'
      recipe
        handle0: create *
        slot0: slot 'rootslotid-set-slotid-0'
        MultiplexSlotsParticle
          particle0: SingleSlotParticle
          foos: reads handle0
          annotationsSet: consumes slot0
    `;
    const manifest = await Manifest.parse(manifestText, {loader, fileName: ''});
    const recipe = manifest.recipes[0];
    assert(recipe.normalize(), `can't normalize recipe`);
    assert(recipe.isResolved(), `recipe isn't resolved`);

    const slotComposer = new SlotComposer();
    const observer = new SlotTestObserver();
    slotComposer.observeSlots(observer);

    const arc = new Arc({id: ArcId.newForTest('test'), slotComposer, context: manifest, loader});

    return {manifest, recipe, observer, arc};
  }

  // tslint:disable-next-line: no-any
  async function instantiateRecipeAndStore(arc: Arc, recipe: Recipe, manifest: Manifest): Promise<CollectionEntityHandle> {
    await arc.instantiate(recipe);
    const inStore = arc.findStoresByType(manifest.findTypeByName('Foo').collectionOf())[0] as CollectionEntityStore;
    const inHandle = await handleForStore(inStore, arc);
    await inHandle.add(Entity.identify(new inHandle.entityClass({value: 'foo1'}), 'subid-1', null));
    await inHandle.add(Entity.identify(new inHandle.entityClass({value: 'foo2'}), 'subid-2', null));
    return inHandle;
  }

  it('multiplex recipe with slots - immediate', async () => {
    const {manifest, recipe, observer, arc} = await initializeManifestAndArc({
      'subid-1': 'dummy-container1', 'subid-2': 'dummy-container2', 'subid-3': 'dummy-container3'
    });

    observer
      .newExpectations()
      .expectRenderSlot('SingleSlotParticle', 'annotation', {times: 2})
      ;
    const inStore = await instantiateRecipeAndStore(arc, recipe, manifest);
    await arc.idle;
    await observer.expectationsCompleted();

    // Add one more element.
    await inStore.add(Entity.identify(new inStore.entityClass({value: 'foo3'}), 'subid-3', null, null));
    observer
       .newExpectations()
       .expectRenderSlot('SingleSlotParticle', 'annotation')
       ;
    await arc.idle;
    await observer.expectationsCompleted();
  });

  it('multiplex recipe with slots - init context later', async () => {
    // This test is different from the one above because it initializes the transformation particle context
    // after the hosted particles are also instantiated.
    // This verifies a different start-render call in slot-composer.
    const {manifest, recipe, observer, arc} = await initializeManifestAndArc();

    const inStore = await instantiateRecipeAndStore(arc, recipe, manifest);

    observer
      .newExpectations()
      .expectRenderSlot('SingleSlotParticle', 'annotation', {times: 2})
      ;
    await arc.idle;
    await observer.expectationsCompleted();

    // Add one more element.
    observer
       .newExpectations()
       .expectRenderSlot('SingleSlotParticle', 'annotation')
       ;
    await inStore.add(Entity.identify(new inStore.entityClass({value: 'foo3'}), 'subid-3', null, null));
    await arc.idle;
    await observer.expectationsCompleted();
  });
});
