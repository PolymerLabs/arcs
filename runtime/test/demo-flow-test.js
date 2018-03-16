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

import Arc from '../arc.js';
import Manifest from '../manifest.js';
import Loader from '../loader.js';
import {assert} from './chai-web.js';
import Planner from '../planner.js';
import * as testUtil from './test-util.js';
import MockSlotComposer from './mock-slot-composer.js';
import TestHelper from './test-helper.js';

describe('demo flow', function() {
  it('can load the recipe manifest', async function() {
    await Manifest.load('./shell/artifacts/Products/Products.recipes', new Loader());
  });

  it('flows like a demo', async function() {
    let expectedPlanString = `recipe
  create as view0 // [~a]
  copy 'manifest:./shell/artifacts/Products/Products.recipes:view0' #shortlist as view1 // [Product]
  map 'manifest:./shell/artifacts/Products/Products.recipes:view1' #wishlist as view2 // [Product]
  create as view3 // [Description]
  copy 'manifest:./shell/artifacts/Products/Products.recipes::8:immediateShowProduct' as view4 // HostedParticleShape
  copy 'manifest:./shell/artifacts/Products/Products.recipes::9:immediateAlsoOn' as view5 // HostedParticleShape2
  slot 'rootslotid-root' #root as slot4
  Chooser as particle0
    choices <- view0
    resultList = view1
    consume action as slot0
      provide annotation as slot1
  Multiplexer as particle1
    hostedParticle = view4
    list <- view1
    consume annotation as slot2
  Multiplexer2 as particle2
    hostedParticle = view5
    list <- view1
    others <- view0
    consume annotation as slot3
  Recommend as particle3
    known <- view1
    population <- view2
    recommendations -> view0
  ShowCollection as particle4
    collection <- view1
    descriptions -> view3
    consume master as slot4
      provide action as slot0
      provide annotation as slot3
      provide item as slot2
      provide postamble as slot5
      provide preamble as slot6`;
    let helper = await TestHelper.loadManifestAndPlan('./shell/artifacts/Products/Products.recipes', {
      expectedNumPlans: 1, // TODO: should be 2 plans, when #988 is fixed
      verify: async (plans) => {
        let {plan, description} = plans.find(p => p.plan.toString() == expectedPlanString);
        assert.equal('Show products from your browsing context (Minecraft Book plus 2 other items) ' +
                     'and choose from products recommended based on products from your browsing context ' +
                     'and Claire\'s wishlist (Book: How to Draw plus 2 other items).',
                     await description.getRecipeSuggestion());
      },
      // Note: options below are useful to debug a failing demo-flow-test.
      // slotComposerStrict: false,
      // logging: true
    });

    // 1. Accept "Show ... and choose ... products" suggestion.
    helper.slotComposer
      .newExpectations()
        .expectRenderSlot('ShowCollection', 'master', {contentTypes: ['template']})
        .expectRenderSlot('ShowCollection', 'master', {contentTypes: ['model'], times: 3})
        .expectRenderSlot('ShowProduct', 'item', {contentTypes: ['template', 'model'], times: 3})
        .expectRenderSlot('Multiplexer', 'annotation', {contentTypes: ['template'], hostedParticle: 'ShowProduct'})
        .expectRenderSlot('Multiplexer', 'annotation', {contentTypes: ['model'], hostedParticle: 'ShowProduct', times: 3})
        .expectRenderSlot('Chooser', 'action', {contentTypes: ['template', 'model']})
        .expectRenderSlot('AlsoOn', 'annotation', {contentTypes: ['template', 'model'], times: 3})
        .expectRenderSlot('Multiplexer2', 'annotation', {contentTypes: ['template']})
        .expectRenderSlot('Multiplexer2', 'annotation', {verify: helper.slotComposer.expectContentItemsNumber.bind(null, 3)})
        .expectRenderSlot('AlsoOn', 'annotation', {contentTypes: ['model'], times: 3, isOptional: true});

    await helper.acceptSuggestion({particles: ['ShowCollection', 'Multiplexer', 'Chooser', 'Recommend', 'Multiplexer2']});

    assert.equal(2, helper.arc.findHandlesByType(helper.arc.context.findSchemaByName('Product').entityClass().type.setViewOf()).length);
    await helper.verifySetSize('ShowCollection', 'collection', 3);
    await helper.verifySetSize('Multiplexer', 'list', 3);
    await helper.verifySetSize('Chooser', 'choices', 3);
    helper.log('----------------------------------------');

    // Replanning.
    let expectedSuggestions = [
      'Check manufacturer information for products from your browsing context ' +
      '(Minecraft Book plus 2 other items).',
      'Buy gifts for Claire\'s Birthday on 2017-08-04, estimate arrival date for ' +
      'products from your browsing context (Minecraft Book plus 2 other items), and estimate ' +
      'arrival date for products recommended based on products from your ' +
      'browsing context and Claire\'s wishlist (Book: How to Draw plus 2 other items).',
      'Recommendations based on Claire\'s wishlist (Book: How to Draw plus 2 other items).',
      // 'Show Claire\'s wishlist (Book: How to Draw plus 2 other items).', // TODO: uncomment when #988 is fixed
      // 'Show products from your browsing context (Minecraft Book plus 2 other items).', // TODO: uncomment when #988 is fixed
      // 'Show products recommended based on products from your browsing context and Claire\'s wishlist (Book: How to Draw plus 2 other items).'
    ];
    await helper.makePlans({
      expectedNumPlans: 3, // TODO: should be 5 plans, when #988 is fixed
      expectedSuggestions});
      helper.log('----------------------------------------');

    // 2. Move an element from recommended list to shortlist.
    let verifyShowCollection = (num, content) => {
      assert(content.model, `Content doesn't have model`);
      assert(content.model.items, `Content model doesn\'t have items, but expected ${num}.`);
      return content.model.items.length == num && content.model.items.every(i => !!i.resolvedImage);
    };
    helper.slotComposer
      .newExpectations()
        .expectRenderSlot('ShowCollection', 'master', {contentTypes: ['model']})
        .expectRenderSlot('Multiplexer', 'annotation', {verify: verifyShowCollection.bind(null, 4), hostedParticle: 'ShowProduct'})
        .expectRenderSlot('ShowProduct', 'item', {contentTypes: ['model']})
        .expectRenderSlot('Chooser', 'action', {verify: helper.slotComposer.expectContentItemsNumber.bind(null, 2)})
        .expectRenderSlot('AlsoOn', 'annotation', {contentTypes: ['model']})
        .expectRenderSlot('Multiplexer2', 'annotation', {verify: helper.slotComposer.expectContentItemsNumber.bind(null, 4)});
    await helper.sendSlotEvent('Chooser', 'action', '_onChooseValue', {key: '1'});
    await helper.verifySetSize('ShowCollection', 'collection', 4);
    await helper.verifySetSize('Multiplexer', 'list', 4);
    await helper.verifySetSize('Chooser', 'choices', 3);
    helper.log('----------------------------------------');

    // Replanning.
    await helper.makePlans({
      expectedNumPlans: 3, // TODO: should be 5 plans, when #988 is fixed
      expectedSuggestions: expectedSuggestions.map(suggestion => {
          return suggestion.replace('Minecraft Book plus 2 other items', 'Minecraft Book plus 3 other items');
      })
    });
    helper.log('----------------------------------------');

    // 3. Select "Buy gift ... and estimate arrival dates ..." suggestion
    helper.slotComposer
      .newExpectations()
        .expectRenderSlot('GiftList', 'preamble', {contentTypes: ['template', 'model']})
        .expectRenderSlot('Multiplexer', 'annotation', {contentTypes: ['template'], times: 2})
        .expectRenderSlot('Multiplexer', 'annotation', {contentTypes: ['model'], times: 7})
        .expectRenderSlot('Multiplexer', 'annotation', {contentTypes: ['model'], times: 7, isOptional: true})
        .expectRenderSlot('Arrivinator', 'annotation', {contentTypes: ['template', 'model'], times: 7});
    await helper.acceptSuggestion({particles: ['GiftList', 'Multiplexer', 'Multiplexer']});
    await helper.idle();
    helper.log('----------------------------------------');

    // 4. Move another element from recommended list to shortlist.
    helper.slotComposer
      .newExpectations()
        .expectRenderSlot('ShowCollection', 'master', {contentTypes: ['model']})
        .expectRenderSlot('Multiplexer', 'annotation', {hostedParticle: 'ShowProduct', verify: verifyShowCollection.bind(null, 5)})
        .expectRenderSlot('ShowProduct', 'item', {contentTypes: ['model']})
        .expectRenderSlot('Chooser', 'action', {verify: helper.slotComposer.expectContentItemsNumber.bind(null, 1)})
        .expectRenderSlot('AlsoOn', 'annotation', {contentTypes: ['model']})
        .expectRenderSlot('Multiplexer2', 'annotation', {verify: helper.slotComposer.expectContentItemsNumber.bind(null, 5)})
        .expectRenderSlot('Multiplexer', 'annotation', {contentTypes: ['model'], times: 2, hostedParticle: 'Arrivinator'})
        .expectRenderSlot('Arrivinator', 'annotation', {contentTypes: ['model']});
    await helper.sendSlotEvent('Chooser', 'action', '_onChooseValue', {key: '1'});
    await helper.verifySetSize('ShowCollection', 'collection', 5);
    await helper.verifySetSize('Multiplexer', 'list', 5);
    await helper.verifySetSize('Chooser', 'choices', 3);
    helper.log('----------------------------------------');

    // 5. Select "Check manufacturer information..." suggestion
    await helper.makePlans({expectedNumPlans: 2}); // TODO: should be 4 plans, when #988 is fixed
    helper.slotComposer
      .newExpectations()
        .expectRenderSlot('Multiplexer', 'annotation', {contentTypes: ['template'], hostedParticle: 'ManufacturerInfo'})
        .expectRenderSlot('Multiplexer', 'annotation', {contentTypes: ['model'], times: 5, hostedParticle: 'ManufacturerInfo'})
        .expectRenderSlot('ManufacturerInfo', 'annotation', {contentTypes: ['template', 'model'], times: 5});
    await helper.acceptSuggestion({particles: ['Multiplexer']});
    helper.log('----------------------------------------');

    // 6. Move the last element to shortlist.
    helper.slotComposer
      .newExpectations()
        .expectRenderSlot('ShowCollection', 'master', {contentTypes: ['model']})
        .expectRenderSlot('Multiplexer', 'annotation', {verify: verifyShowCollection.bind(null, 6), hostedParticle: 'ShowProduct'})
        .expectRenderSlot('ShowProduct', 'item', {contentTypes: ['model']})
        .expectRenderSlot('Chooser', 'action', {verify: (content) => !content.model})
        .expectRenderSlot('Multiplexer2', 'annotation', {verify: helper.slotComposer.expectContentItemsNumber.bind(null, 6)})
        .expectRenderSlot('AlsoOn', 'annotation', {contentTypes: ['model']})
        .expectRenderSlot('Multiplexer', 'annotation', {contentTypes: ['model'], times: 2, hostedParticle: 'Arrivinator'})
        .expectRenderSlot('Arrivinator', 'annotation', {contentTypes: ['model']})
        .expectRenderSlot('Multiplexer', 'annotation', {contentTypes: ['model'], times: 2, hostedParticle: 'ManufacturerInfo'})
        .expectRenderSlot('ManufacturerInfo', 'annotation', {contentTypes: ['model']});
    await helper.sendSlotEvent('Chooser', 'action', '_onChooseValue', {key: '0'});
    await helper.verifySetSize('ShowCollection', 'collection', 6);
    await helper.verifySetSize('Multiplexer', 'list', 6);
    await helper.verifySetSize('Chooser', 'choices', 3);
    helper.log('----------------------------------------');

    // 7. Accept 'Recommendations based on...' suggestion
    await helper.makePlans({expectedNumPlans: 1}); // TODO: should be 3 plans, when #988 is fixed
    helper.slotComposer
      .newExpectations()
      .expectRenderSlot('Interests', 'postamble', {contentTypes: ['template', 'model']});
    await helper.acceptSuggestion({particles: ['Interests']});
    await helper.makePlans({expectedNumPlans: 0}); // TODO: should be 2 plans, when #988 is fixed
    helper.log('----------------------------------------');

    // TODO(mmandlis): Provide methods in helper to verify slot contents (helper.slotComposer._slots[i]._content).
  }).timeout(10000);
});
