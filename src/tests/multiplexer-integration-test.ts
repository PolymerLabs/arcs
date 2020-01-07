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
//import {HostedSlotContext} from '../runtime/slot-context.js';
//import {HeadlessSlotDomConsumer} from '../runtime/headless-slot-dom-consumer.js';
import {Manifest} from '../runtime/manifest.js';
import {Runtime} from '../runtime/runtime.js';
//import {MockSlotComposer} from '../runtime/testing/mock-slot-composer.js';
import {SlotTestObserver} from '../runtime/testing/slot-test-observer.js';
import {checkDefined} from '../runtime/testing/preconditions.js';
import {StubLoader} from '../runtime/testing/stub-loader.js';
import {TestVolatileMemoryProvider} from '../runtime/testing/test-volatile-memory-provider.js';
import {collectionHandleForTest, storageKeyPrefixForTest} from '../runtime/testing/handle-for-test.js';
import {StrategyTestHelper} from '../planning/testing/strategy-test-helper.js';

describe('MultiplexerFOO', () => {
  it('renders polymorphic multiplexed slots', async () => {
    const loader = new StubLoader({});
    const memoryProvider = new TestVolatileMemoryProvider();
    const context = await Manifest.load(
      './src/tests/particles/artifacts/polymorphic-muxing.recipes',
      loader,
      {memoryProvider}
    );

    const showOneParticle = context.particles.find(p => p.name === 'ShowOne');
    const showTwoParticle = context.particles.find(p => p.name === 'ShowTwo');
    const showOneSpec = JSON.stringify(showOneParticle.toLiteral());
    const showTwoSpec = JSON.stringify(showTwoParticle.toLiteral());
    const recipeOne = `${showOneParticle.toString()}\nrecipe\n  v1: use '{{item_id}}'\n  s1: slot '{{slot_id}}'\n  ShowOne\n    post: reads v1\n    item: consumes s1`;
    const recipeTwo = `${showTwoParticle.toString()}\nrecipe\n  v1: use '{{item_id}}'\n  s1: slot '{{slot_id}}'\n  ShowTwo\n    post: reads v1\n    item: consumes s1`;
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

    // version could be set here, but doesn't matter for tests.
    const runtime = new Runtime({loader, context, memoryProvider});
    const arc = runtime.newArc('demo', storageKeyPrefixForTest());

    const observer = new SlotTestObserver();
    arc.pec.slotComposer.observeSlots(observer);

    const suggestions = await StrategyTestHelper.planForArc(arc);
    assert.lengthOf(suggestions, 1);

    const slotComposer = arc.pec.slotComposer;

    // Render 3 posts
    observer
        .newExpectations()
        .expectRenderSlot('List', 'root')
        //.expectRenderSlot('PostMuxer', 'item')
        //.expectRenderSlot('PostMuxer', 'item', {times: 2, isOptional: true})
        .expectRenderSlot('ShowOne', 'item', {times: 2})
        .expectRenderSlot('ShowTwo', 'item')
        ;

    await suggestions[0].instantiate(arc);
    await arc.idle;

    // Add and render one more post
    observer
        .newExpectations()
        .expectRenderSlot('List', 'root')
        //.expectRenderSlot('PostMuxer', 'item')
        .expectRenderSlot('ShowOne', 'item')
        //.expectRenderSlot('PostMuxer', 'item')
        ;

    const postsStore = await collectionHandleForTest(arc, arc.findStoreById(arc.activeRecipe.handles[0].id));
    await postsStore.add(
        Entity.identify(new postsStore.entityClass({message: 'w', renderRecipe: recipeOne, renderParticleSpec: showOneSpec}), '4'));

    await arc.idle;

    // TODO(sjmiles): contexts have been evacipated
    //assert.lengthOf(slotComposer.contexts.filter(ctx => ctx instanceof HostedSlotContext), 4);
    assert.lengthOf(slotComposer.consumers, 6);

    const itemSlot = slotComposer.consumers.find(s => s.consumeConn.name === 'item');
    // TODO(sjmiles): why not assert?
    checkDefined(itemSlot);

    // TODO(sjmiles): tested information is no longer tracked in these objects

    // verify model
    // const items = itemSlot.renderings.map(([subId, item]) => item);
    // assert.lengthOf(items, 4);
    // [{subId: '1', message: 'x'}, {subId: '2', message: 'y'}, {subId: '3', message: 'z'}, {subId: '4', message: 'w'}].forEach(expected => {
    //     assert(items.find(item => item.model.subId === expected.subId && item.model.message === expected.message),
    //           `Cannot find item {subId: '${expected.subId}', message: '${expected.message}'`);
    // });

    // // verify template names
    // for (const item of items) {
    //   if (item.model.subId === '2') {
    //     assert.strictEqual('PostMuxer::item::ShowTwo::item::default', item.templateName);
    //   } else {
    //     assert.strictEqual('PostMuxer::item::ShowOne::item::default', item.templateName);
    //   }
    // }

    // verify template cache
    // HeadlessSlotDomConsumer.hasTemplate('PostMuxer::item::ShowOne::item::default');
    // HeadlessSlotDomConsumer.hasTemplate('PostMuxer::item::ShowTwo::item::default');
    // HeadlessSlotDomConsumer.hasTemplate('PostMuxer::item::default');
    // HeadlessSlotDomConsumer.hasTemplate('Root::item::ShowOne::item::default');
  });
});
