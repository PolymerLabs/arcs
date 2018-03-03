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
  create as view0 // Product List
  copy 'manifest:./shell/artifacts/Products/Products.recipes:view0' #shortlist as view1 // Product List
  map 'manifest:./shell/artifacts/Products/Products.recipes:view1' #wishlist as view2 // Product List
  create as view3 // Description List
  copy 'manifest:./shell/artifacts/Products/Products.recipes::9:immediateAlsoOn' as view4 // SHAAAAPE
  copy 'manifest:./shell/artifacts/Products/Products.recipes::8:immediateShowProduct' as view5 // SHAAAAPE
  slot 'rootslotid-root' #root as slot3
  Chooser as particle0
    choices <- view0
    resultList = view1
    consume action as slot0
      provide annotation as slot1
  Multiplexer2 as particle1
    hostedParticle = view4
    list <- view1
    others <- view0
    consume annotation as slot2
  Recommend as particle2
    known <- view1
    population <- view2
    recommendations -> view0
  ShowCollection as particle3
    collection <- view1
    descriptions -> view3
    hostedParticle = view5
    consume master as slot3
      provide action as slot0
      provide annotation as slot2
      provide postamble as slot4
      provide preamble as slot5`;
    let helper = await TestHelper.loadManifestAndPlan('./shell/artifacts/Products/Products.recipes', {
      expectedNumPlans: 2,
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
        .expectRenderSlot('ShowProduct', 'root', ['template', 'model'], 3)
        .expectRenderSlot('ShowCollection', 'master', ['template'])
        .expectRenderSlot('ShowCollection', 'master', ['model'], 3)
        .expectRenderSlot('Chooser', 'action', ['template', 'model'])
        .expectRenderSlot('AlsoOn', 'annotation', ['template', 'model'], 3)
        .expectRenderSlot('Multiplexer2', 'annotation', ['template'])
        .expectRenderSlotVerify('Multiplexer2', 'annotation', helper.slotComposer.expectContentItemsNumber.bind(null, 3))
        .maybeRenderSlot('AlsoOn', 'annotation', ['model'], 3);

    await helper.acceptSuggestion({particles: ['ShowCollection', 'Chooser', 'Recommend', 'Multiplexer2']});

    assert.equal(2, helper.arc.findHandlesByType(helper.arc.context.findSchemaByName('Product').entityClass().type.setViewOf()).length);
    await helper.verifySetSize('ShowCollection', 'collection', 3);
    await helper.verifySetSize('Chooser', 'choices', 3);

    // Replanning.
    let expectedSuggestions = [
      'Check manufacturer information for products from your browsing context ' +
      '(Minecraft Book plus 2 other items).',
      'Show Claire\'s wishlist (Book: How to Draw plus 2 other items).',
      'Buy gifts for Claire\'s Birthday on 2017-08-04, estimate arrival date for ' +
      'products from your browsing context (Minecraft Book plus 2 other items), and estimate ' +
      'arrival date for products recommended based on products from your ' +
      'browsing context and Claire\'s wishlist (Book: How to Draw plus 2 other items).',
      'Recommendations based on Claire\'s wishlist (Book: How to Draw plus 2 other items).'];
    await helper.makePlans({expectedNumPlans: 4, expectedSuggestions});

    // 2. Move an element from recommended list to shortlist.
    helper.slotComposer
      .newExpectations()
        .expectRenderSlot('ShowCollection', 'master', ['model'])
        .expectRenderSlot('ShowProduct', 'root', ['model'])
        .expectRenderSlot('ShowCollection', 'master', ['model'])
        .expectRenderSlotVerify('Chooser', 'action', helper.slotComposer.expectContentItemsNumber.bind(null, 2))
        .expectRenderSlot('AlsoOn', 'annotation', ['model'])
        .expectRenderSlotVerify('Multiplexer2', 'annotation', helper.slotComposer.expectContentItemsNumber.bind(null, 4));
    await helper.sendSlotEvent('Chooser', 'action', '_onChooseValue', {key: '1'});
    await helper.verifySetSize('ShowCollection', 'collection', 4);
    await helper.verifySetSize('Chooser', 'choices', 3);

    // Replanning.
    await helper.makePlans({
      expectedNumPlans: 4,
      expectedSuggestions: expectedSuggestions.map(suggestion => {
          return suggestion.replace(/products from your browsing context/g, 'my short list')
                           .replace('Minecraft Book plus 2 other items', 'Minecraft Book plus 3 other items');
      })
    });

    // 3. Select "Buy gift ... and estimate arrival dates ..." suggestion
    helper.slotComposer
      .newExpectations()
        .expectRenderSlot('GiftList', 'preamble', ['template', 'model'])
        .expectRenderSlot('Multiplexer', 'annotation', ['template'], 2)
        .expectRenderSlot('Multiplexer', 'annotation', ['model'], 7)
        .maybeRenderSlot('Multiplexer', 'annotation', ['model'], 7)
        .expectRenderSlot('Arrivinator', 'annotation', ['template', 'model'], 7);
    await helper.acceptSuggestion({particles: ['GiftList', 'Multiplexer', 'Multiplexer']});
    await helper.idle();

    // 4. Move another element from recommended list to shortlist.
    helper.slotComposer
      .newExpectations()
        .expectRenderSlot('ShowCollection', 'master', ['model'], 2)
        .expectRenderSlot('ShowProduct', 'root', ['model'])
        .expectRenderSlotVerify('Chooser', 'action', helper.slotComposer.expectContentItemsNumber.bind(null, 1))
        .expectRenderSlot('AlsoOn', 'annotation', ['model'])
        .expectRenderSlotVerify('Multiplexer2', 'annotation', helper.slotComposer.expectContentItemsNumber.bind(null, 5))
        .expectRenderSlot('Multiplexer', 'annotation', ['model'], 2)
        .expectRenderSlot('Arrivinator', 'annotation', ['model']);
    await helper.sendSlotEvent('Chooser', 'action', '_onChooseValue', {key: '1'});
    await helper.verifySetSize('ShowCollection', 'collection', 5);
    await helper.verifySetSize('Chooser', 'choices', 3);

    // 5. Select "Check manufacturer information..." suggestion
    await helper.makePlans({expectedNumPlans: 3});
    helper.slotComposer
      .newExpectations()
        .expectRenderSlot('Multiplexer', 'annotation', ['template'])
        .expectRenderSlot('Multiplexer', 'annotation', ['model'], 5)
        .expectRenderSlot('ManufacturerInfo', 'annotation', ['template', 'model'], 5);
    await helper.acceptSuggestion({particles: ['Multiplexer']});

    // 6. Move the last element to shortlist.
    helper.slotComposer
      .newExpectations()
        .expectRenderSlot('ShowCollection', 'master', ['model'], 2)
        .expectRenderSlot('ShowProduct', 'root', ['model'])
        .expectRenderSlotVerify('Chooser', 'action', (content) => !content.model)
        .expectRenderSlotVerify('Multiplexer2', 'annotation', helper.slotComposer.expectContentItemsNumber.bind(null, 6))
        .expectRenderSlot('AlsoOn', 'annotation', ['model'])
        .expectRenderSlot('Multiplexer', 'annotation', ['model'], 4)
        .expectRenderSlot('Arrivinator', 'annotation', ['model'])
        .expectRenderSlot('ManufacturerInfo', 'annotation', ['model']);
    await helper.sendSlotEvent('Chooser', 'action', '_onChooseValue', {key: '0'});
    await helper.verifySetSize('ShowCollection', 'collection', 6);
    await helper.verifySetSize('Chooser', 'choices', 3);

    // 7. Accept 'Recommendations based on...' suggestion
    await helper.makePlans({expectedNumPlans: 2});
    helper.slotComposer
      .newExpectations()
      .expectRenderSlot('Interests', 'postamble', ['template', 'model']);
    await helper.acceptSuggestion({particles: ['Interests']});
    await helper.makePlans({expectedNumPlans: 1});

    // TODO(mmandlis): Provide methods in helper to verify slot contents (helper.slotComposer._slots[i]._content).
  }).timeout(10000);
});
