/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

'use strict';

import {Manifest} from '../manifest.js';
import {Loader} from '../loader.js';
import {assert} from './chai-web.js';
import * as testUtil from '../testing/test-util.js';
import {TestHelper} from '../testing/test-helper.js';

describe('demo flow', function() {
  it('can load the recipe manifest', async function() {
    await Manifest.load('./artifacts/Products/Products.recipes', new Loader());
  });

  it('flows like a demo', async function() {
    let helper = await TestHelper.createAndPlan({
      manifestFilename: './artifacts/Products/Products.recipes',
      expectedNumPlans: 1,
      verify: async plans => {
        let descriptions = await Promise.all(plans.map(plan => plan.description.getRecipeSuggestion()));
        assert.include(descriptions, `Show products from your browsing context (Minecraft Book plus 2 other items).`);
                    //   'Show products from your browsing context (Minecraft Book plus 2 other items) ' +
                    //  'and choose from products recommended based on products from your browsing context ' +
                    //  'and Claire\'s wishlist (Book: How to Draw plus 2 other items).');
      },
      // Note: options below are useful to debug a failing demo-flow-test.
      // slotComposerStrict: false,
      // logging: true
    });

    helper.setTimeout(500);

    // 1. Accept "Show products from your browsing context (...)." suggestion
    helper.slotComposer
      .newExpectations('Show products from your browsing context (...)')
        .expectRenderSlot('List', 'root', {contentTypes: ['template', 'model']})
        .expectRenderSlot('ShowProduct', 'item', {contentTypes: ['template', 'model']})
        .expectRenderSlot('ShowProduct', 'item', {contentTypes: ['model'], times: 2})
        .expectRenderSlot('ItemMultiplexer', 'item', {contentTypes: ['template', 'model'], hostedParticle: 'ShowProduct'})
        .expectRenderSlot('ItemMultiplexer', 'item', {contentTypes: ['model'], hostedParticle: 'ShowProduct', times: 2, isOptional: true})
        ;
    await helper.acceptSuggestion({particles: ['List', 'ItemMultiplexer']});

    assert.lengthOf(helper.arc.findStoresByType(helper.arc.context.findSchemaByName('Product').entityClass().type.collectionOf()), 1);

    await helper.verifySetSize('List', 'items', 3);
    await helper.verifySetSize('ItemMultiplexer', 'list', 3);
    helper.log('----------------------------------------');

    // Replanning.
    await helper.makePlans({
      expectedNumPlans: 2,
      expectedSuggestions: [
        `Check shipping for Claire's Birthday on 2019-08-04.`,
        'Check manufacturer information for products from your browsing context ' +
        '(Minecraft Book plus 2 other items).'
      ]
    });
    helper.log('----------------------------------------');

    // Accept "Check shipping for Claire (Claire)'s Birthday on..." suggestion.
    helper.slotComposer
      .newExpectations('Check shipping for Claire\'s Birthday on...')
        .expectRenderSlot('GiftList', 'preamble', {contentTypes: ['template', 'model']})
        .expectRenderSlot('Arrivinator', 'annotation', {contentTypes: ['template', 'model'], times: 3})
        .expectRenderSlot('AlternateShipping', 'annotation', {contentTypes: ['template', 'model'], times: 3})
        .expectRenderSlot('Multiplexer', 'annotation', {
          hostedParticle: 'Arrivinator',
          contentTypes: ['template'],
          verify: helper.slotComposer.expectContentItemsNumber.bind(null, 3)})
        .expectRenderSlot('Multiplexer', 'annotation', {
          hostedParticle: 'AlternateShipping',
          contentTypes: ['template'],
          verify: helper.slotComposer.expectContentItemsNumber.bind(null, 3)});

    await helper.acceptSuggestion({particles: ['GiftList', 'Multiplexer', 'Multiplexer']});
    await helper.idle();
    helper.log('----------------------------------------');

    // Replanning.
    await helper.makePlans({
      expectedNumPlans: 3,
      expectedSuggestions: [
        'Find out about Claire\'s interests.',
        'Add items from Claire\'s wishlist (Book: How to Draw plus 2 other items).',
        'Check manufacturer information for products from your browsing context (Minecraft Book plus 2 other items).'
      ]
    });

    // Accept "Add items from Claire's wishlist (...)" suggestion.
    helper.slotComposer
      .newExpectations('Add items from Claire\'s wishlist (...)')
        .expectRenderSlot('Chooser', 'action', {contentTypes: ['template'], verify: helper.slotComposer.expectContentItemsNumber.bind(null, 3)})
        .expectRenderSlot('AlsoOn', 'annotation', {contentTypes: ['template']})
        .expectRenderSlot('AlsoOn', 'annotation', {contentTypes: ['model'], times: 3})
        .expectRenderSlot('Multiplexer2', 'annotation', {contentTypes: ['template'], verify: helper.slotComposer.expectContentItemsNumber.bind(null, 3)});
    await helper.acceptSuggestion({particles: ['Chooser', 'Multiplexer2', 'Recommend']});
    await helper.idle();
    helper.log('----------------------------------------');

    // Move an element from recommended list to shortlist.
    let verifyContents = (num, content) => {
      assert(content.model, `Content doesn't have model`);
      assert(content.model.items, `Content model doesn't have items, but expected ${num}.`);
      return content.model.items.length == num && content.model.items.every(i => !!i.resolvedImage);
    };
    let verifyElementMove = async (key, num, muxerHostedParticles) => {
        helper.slotComposer
          .newExpectations('Move and element from recommended list to shortlist')
            .expectRenderSlot('List', 'root', {contentTypes: ['model']})
            .expectRenderSlot('ItemMultiplexer', 'item', {verify: verifyContents.bind(null, num), hostedParticle: 'ShowProduct'})
            .expectRenderSlot('ShowProduct', 'item', {contentTypes: ['model']})
            .expectRenderSlot('Chooser', 'action', {verify: helper.slotComposer.expectContentItemsNumber.bind(null, (6-num))})
            .expectRenderSlot('AlsoOn', 'annotation', {contentTypes: ['model']})
            .expectRenderSlot('Multiplexer2', 'annotation', {verify: helper.slotComposer.expectContentItemsNumber.bind(null, num)});
        for (let hostedParticle of muxerHostedParticles) {
          helper.slotComposer
            .expectRenderSlot(hostedParticle, 'annotation', {contentTypes: ['model']})
            .expectRenderSlot('Multiplexer', 'annotation', {hostedParticle: hostedParticle, verify: helper.slotComposer.expectContentItemsNumber.bind(null, num)});
        }
        await helper.sendSlotEvent('Chooser', 'action', '_onChooseValue', {key});
        await helper.verifySetSize('List', 'items', num);
        await helper.verifySetSize('Multiplexer', 'list', num);
        await helper.verifySetSize('Chooser', 'choices', 3);
    };
    await verifyElementMove(/* key= */ 0, /* num= */ 4, ['Arrivinator', 'AlternateShipping']);
    helper.log('----------------------------------------');

    // Accept "Check manufacturer information for products from your browsing context (...)." suggestion
    await helper.makePlans({
      expectedNumPlans: 2,
      expectedSuggestions: [
        'Find out about Claire\'s interests.',
        'Check manufacturer information for products from your browsing context (Minecraft Book plus 3 other items).'
      ]
    });
    helper.slotComposer
      .newExpectations('Check manufacturer information for products from your browsing context (...)')
        .expectRenderSlot('Multiplexer', 'annotation', {
          hostedParticle: 'ManufacturerInfo',
          contentTypes: ['template'],
          verify: helper.slotComposer.expectContentItemsNumber.bind(null, 4)})
        .expectRenderSlot('ManufacturerInfo', 'annotation', {contentTypes: ['template', 'model'], times: 4});
    await helper.acceptSuggestion({particles: ['Multiplexer'], hostedParticles: ['ManufacturerInfo']});
    helper.log('----------------------------------------');

    // Move another element from recommended list to shortlist.
    await verifyElementMove(/* key= */ 1, /* num= */ 5, ['Arrivinator', 'AlternateShipping', 'ManufacturerInfo']);

    // Accept "Find out about Claire's interests." suggestion
    helper.slotComposer
      .newExpectations('Find out about Claire\'s interests')
        .expectRenderSlot('Interests', 'postamble', {contentTypes: ['template', 'model']});
    await helper.acceptSuggestion({particles: ['Interests']});
    helper.log('----------------------------------------');

    // Move the last element from recommended list to shortlist.
    await verifyElementMove(/* key= */ 0, /* num= */ 6, ['Arrivinator', 'AlternateShipping', 'ManufacturerInfo']);
    helper.log('----------------------------------------');

    await helper.makePlans({expectedNumPlans: 0});
    helper.log('----------------------------------------');

    helper.clearTimeout();

    // TODO(mmandlis): Provide methods in helper to verify slot contents (helper.slotComposer.consumers[i]._content).
  }).timeout(10000);
});
