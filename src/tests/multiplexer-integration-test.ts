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
import {HostedSlotContext} from '../runtime/slot-context.js';
import {HeadlessSlotDomConsumer} from '../runtime/headless-slot-dom-consumer.js';
import {checkDefined} from '../runtime/testing/preconditions.js';
import {PlanningTestHelper} from '../planning/testing/planning-test-helper.js';
import {collectionHandleForTest} from '../runtime/testing/handle-for-test.js';
import {Entity} from '../runtime/entity.js';

describe('Multiplexer', () => {
  it('renders polymorphic multiplexed slots', async () => {
    const helper = await PlanningTestHelper.create({
      manifestFilename: './src/tests/particles/artifacts/polymorphic-muxing.recipes'
    });
    const context = helper.arc.context;

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
    await helper.makePlans();

    // Render 3 posts
    helper.slotComposer
        .newExpectations()
        .expectRenderSlot('List', 'root', {contentTypes: ['template', 'model']})
        .expectRenderSlot('PostMuxer', 'item', {contentTypes: ['template', 'templateName', 'model']})
        .expectRenderSlot('PostMuxer', 'item', {contentTypes: ['template', 'templateName', 'model'], times: 2, isOptional: true})
        .expectRenderSlot('ShowOne', 'item', {contentTypes: ['template', 'templateName', 'model'], times: 2})
        .expectRenderSlot('ShowTwo', 'item', {contentTypes: ['template', 'templateName', 'model']});
    await helper.acceptSuggestion({particles: ['PostMuxer', 'List']});

    // Add and render one more post
    helper.slotComposer
        .newExpectations()
        .expectRenderSlot('List', 'root', {contentTypes: ['templateName', 'model']})
        .expectRenderSlot('PostMuxer', 'item', {contentTypes: ['templateName', 'model']})
        .expectRenderSlot('ShowOne', 'item', {contentTypes: ['templateName', 'model']})
        .expectRenderSlot('PostMuxer', 'item', {contentTypes: ['templateName', 'model']});
    const postsStore = await collectionHandleForTest(helper.arc, helper.arc.findStoreById(helper.arc.activeRecipe.handles[0].id));
    await postsStore.add(
        Entity.identify(new postsStore.entityClass({message: 'w', renderRecipe: recipeOne, renderParticleSpec: showOneSpec}), '4'));
    await helper.idle();
    assert.lengthOf(helper.slotComposer.contexts.filter(ctx => ctx instanceof HostedSlotContext), 4);
    assert.lengthOf(helper.slotComposer.consumers, 6);
    const itemSlot = checkDefined(helper.slotComposer.consumers.find(s => s.consumeConn.name === 'item'));
    const items = itemSlot.renderings.map(([subId, item]) => item);

    // verify model
    assert.lengthOf(items, 4);
    [{subId: '1', message: 'x'}, {subId: '2', message: 'y'}, {subId: '3', message: 'z'}, {subId: '4', message: 'w'}].forEach(expected => {
        assert(items.find(item => item.model.subId === expected.subId && item.model.message === expected.message),
              `Cannot find item {subId: '${expected.subId}', message: '${expected.message}'`);
    });

    // verify template names
    for (const item of items) {
      if (item.model.subId === '2') {
        assert.strictEqual('PostMuxer::item::ShowTwo::item::default', item.templateName);
      } else {
        assert.strictEqual('PostMuxer::item::ShowOne::item::default', item.templateName);
      }
    }

    // verify template cache
    HeadlessSlotDomConsumer.hasTemplate('PostMuxer::item::ShowOne::item::default');
    HeadlessSlotDomConsumer.hasTemplate('PostMuxer::item::ShowTwo::item::default');
    HeadlessSlotDomConsumer.hasTemplate('PostMuxer::item::default');
    HeadlessSlotDomConsumer.hasTemplate('Root::item::ShowOne::item::default');
  });
});
