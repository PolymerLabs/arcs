/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {assert} from '../platform/chai-web.js';
import {Entity} from '../runtime/entity.js';
import {Manifest} from '../runtime/manifest.js';
import {Runtime} from '../runtime/runtime.js';
import {SlotTestObserver} from '../runtime/testing/slot-test-observer.js';
//import {checkDefined} from '../runtime/testing/preconditions.js';
import {Loader} from '../platform/loader.js';
import {TestVolatileMemoryProvider} from '../runtime/testing/test-volatile-memory-provider.js';
import {collectionHandleForTest, storageKeyPrefixForTest} from '../runtime/testing/handle-for-test.js';
import {StrategyTestHelper} from '../planning/testing/strategy-test-helper.js';
import {RamDiskStorageDriverProvider} from '../runtime/storageNG/drivers/ramdisk.js';
import {Flags} from '../runtime/flags.js';
import {DriverFactory} from '../runtime/storageNG/drivers/driver-factory.js';

describe('Multiplexer', () => {
  it('renders polymorphic multiplexed slots', async () => {
    const memoryProvider = new TestVolatileMemoryProvider();
    RamDiskStorageDriverProvider.register(memoryProvider);
    const loader = new Loader();
    const manifest = './src/tests/particles/artifacts/polymorphic-muxing.recipes';
    const context = await Manifest.load(manifest, loader, {memoryProvider});

    const showOneParticle = context.particles.find(p => p.name === 'ShowOne');
    const showOneSpec = JSON.stringify(showOneParticle.toLiteral());
    const recipeOne = `${showOneParticle.toString()}\nrecipe\n  v1: use '{{item_id}}'\n  s1: slot '{{slot_id}}'\n  ShowOne\n    post: reads v1\n    item: consumes s1`;

    const showTwoParticle = context.particles.find(p => p.name === 'ShowTwo');
    const showTwoSpec = JSON.stringify(showTwoParticle.toLiteral());
    const recipeTwo = `${showTwoParticle.toString()}\nrecipe\n  v1: use '{{item_id}}'\n  s1: slot '{{slot_id}}'\n  ShowTwo\n    post: reads v1\n    item: consumes s1`;

    if (Flags.useNewStorageStack) {
      const postsHandle =
          await collectionHandleForTest(context, context.stores[0]);
      await postsHandle.add(Entity.identify(
          new postsHandle.entityClass({
            message: 'x',
            renderRecipe: recipeOne,
            renderParticleSpec: showOneSpec
          }),
          '1'));
      await postsHandle.add(Entity.identify(
          new postsHandle.entityClass({
            message: 'y',
            renderRecipe: recipeTwo,
            renderParticleSpec: showTwoSpec
          }),
          '2'));
      await postsHandle.add(Entity.identify(
          new postsHandle.entityClass({
            message: 'z',
            renderRecipe: recipeOne,
            renderParticleSpec: showOneSpec
          }),
          '3'));
    } else {
      const postsStub = context.stores[0].castToStorageStub();
      postsStub.model.push({
        id: '1',
        keys: ['key1'],
        value: {
          id: '1',
          rawData: {message: 'x', renderRecipe: recipeOne, renderParticleSpec: showOneSpec}
        }
      });
      postsStub.model.push({
        id: '2',
        keys: ['key2'],
        value: {
          id: '2',
          rawData: {message: 'y', renderRecipe: recipeTwo, renderParticleSpec: showTwoSpec}
        }
      });
      postsStub.model.push({
        id: '3',
        keys: ['key3'],
        value: {
          id: '3',
          rawData: {message: 'z', renderRecipe: recipeOne, renderParticleSpec: showOneSpec}
        }
      });
      postsStub['referenceMode'] = false;
    }
    // version could be set here, but doesn't matter for tests.
    const runtime = new Runtime({loader, context, memoryProvider});
    const arc = runtime.newArc('demo', storageKeyPrefixForTest());

    const observer = new SlotTestObserver();
    arc.pec.slotComposer.observeSlots(observer);

    const suggestions = await StrategyTestHelper.planForArc(arc);
    assert.lengthOf(suggestions, 1);

    // Render 3 posts
    observer
      .newExpectations()
      .expectRenderSlot('List', 'root')
      .expectRenderSlot('ShowOne', 'item', {times: 2})
      .expectRenderSlot('ShowTwo', 'item')
      ;

    await suggestions[0].instantiate(arc);
    await arc.idle;

    // Add and render one more post
    observer
      .newExpectations()
      .expectRenderSlot('List', 'root')
      .expectRenderSlot('ShowOne', 'item', {contentTypes: ['templateName', 'model']})
      ;

    const postsStore = await collectionHandleForTest(arc, arc.findStoreById(arc.activeRecipe.handles[0].id));
    const entityClass = new postsStore.entityClass({
      message: 'w',
      renderRecipe: recipeOne,
      renderParticleSpec: showOneSpec
    });
    const entity = Entity.identify(entityClass, '4', null);
    await postsStore.add(entity);
    await arc.idle;

    DriverFactory.clearRegistrationsForTesting();
  });
});
