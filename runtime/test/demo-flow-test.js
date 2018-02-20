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

describe('demo flow', function() {
  async function makePlans(arc, expectedSuggestions) {
    let planner = new Planner();
    planner.init(arc);
    let plans = await planner.suggest();

    if (!!expectedSuggestions) {
      let suggestions = await Promise.all(plans.map(async p => await p.description.getRecipeSuggestion()));
      expectedSuggestions.forEach(expectedSuggestion => {
        assert(!!suggestions.find(s => s === expectedSuggestion),
               `Cannot find expected suggestion "${expectedSuggestion}" in the ${plans.length} generated plans.`);
      });
    }

    return plans;
  }

  it('can load the recipe manifest', async function() {
    await Manifest.load('./runtime/browser/demo/recipes.manifest', new Loader());
  });

  it('flows like a demo', async function() {
    let loader = new Loader();
    let pecFactory = null;
    let slotComposer = new MockSlotComposer();
    let arc = new Arc({
      id: 'demo',
      pecFactory,
      slotComposer,
      context: await Manifest.load('./runtime/browser/demo/recipes.manifest', loader),
      loader
    });
    let Product = arc.context.findSchemaByName('Product').entityClass();

    slotComposer.pec = arc.pec;
    let plans = await makePlans(arc);
    assert.equal(plans.length, 2);

    // Choose a plan to test with.
    let expectedPlanString = `recipe
  create as view0 // Product List
  copy 'manifest:./runtime/browser/demo/recipes.manifest:view0' #shortlist as view1 // Product List
  map 'manifest:./runtime/browser/demo/recipes.manifest:view1' #wishlist as view2 // Product List
  create as view3 // Description List
  map 'manifest:./runtime/browser/demo/recipes.manifest::7:immediateAlsoOn' as view4 // SHAAAAPE
  slot 'rootslotid-root' as slot3
  Chooser as particle0
    choices <- view0
    resultList = view1
    consume action as slot0
      provide annotation as slot1
  Multiplexer2 as particle1
    hostedParticle host view4
    list <- view1
    others <- view0
    consume annotation as slot2
  Recommend as particle2
    known <- view1
    population <- view2
    recommendations -> view0
  ShowItems as particle3
    descriptions -> view3
    list <- view1
    consume root as slot3
      provide action as slot0
      provide annotation as slot2
      provide postamble as slot4
      provide preamble as slot5`;
    let {plan, description} = plans.find(p => p.plan.toString() == expectedPlanString);

    assert.equal('Show products from your browsing context (Minecraft Book plus 2 other items) ' +
                 'and choose from products recommended based on products from your browsing context ' +
                 'and Claire\'s wishlist (Book: How to Draw plus 2 other items).',
                 await description.getRecipeSuggestion());

    slotComposer
      .newExpectations()
        .expectRenderSlot('ShowItems', 'root', ['template'])
      .newExpectations()
        .expectRenderSlot('ShowItems', 'root', ['model'])
        .expectRenderSlot('Chooser', 'action', ['template', 'model'])
        .expectRenderSlot('AlsoOn', 'annotation', ['template', 'model'])
        .expectRenderSlot('Multiplexer2', 'annotation', ['template'])
        .expectRenderSlot('Multiplexer2', 'annotation', ['model'], slotComposer.expectContentItemsNumber.bind(null, 3))
        .expectRenderSlot('AlsoOn', 'annotation', ['template', 'model'])
        .expectRenderSlot('AlsoOn', 'annotation', ['template', 'model'])
        .maybeRenderSlot('AlsoOn', 'annotation', ['model'])
        .maybeRenderSlot('AlsoOn', 'annotation', ['model'])
        .maybeRenderSlot('AlsoOn', 'annotation', ['model']);
    await arc.instantiate(plan);
    await arc.pec.idle;
    await slotComposer.expectationsCompleted();
    let productViews = arc.findHandlesByType(Product.type.setViewOf());
    assert.equal(productViews.length, 2);

    // Verify next stage suggestions.
    let expectedSuggestions = [
      'Check manufacturer information for products from your browsing context ' +
      '(Minecraft Book plus 2 other items).',
      'Show Claire\'s wishlist (Book: How to Draw plus 2 other items).',
      'Buy gifts for Claire\'s Birthday on 2017-08-04, estimate arrival date for ' +
      'products from your browsing context (Minecraft Book plus 2 other items), and estimate ' +
      'arrival date for products recommended based on products from your ' +
      'browsing context and Claire\'s wishlist (Book: How to Draw plus 2 other items).',
      'Recommendations based on Claire\'s wishlist (Book: How to Draw plus 2 other items).'
    ];
    plans = await makePlans(arc, expectedSuggestions);
    assert.equal(plans.length, 4);

    // Move an element from recommended list to shortlist.
    slotComposer
      .newExpectations()
        .thenSend('Chooser', 'action', '_onChooseValue', {key: '1'})
      .newExpectations()
        .expectRenderSlot('ShowItems', 'root', ['model'])
        .expectRenderSlot('Chooser', 'action', ['model'])
        .expectRenderSlot('AlsoOn', 'annotation', ['model'])
        .expectRenderSlot('Multiplexer2', 'annotation', ['model'], slotComposer.expectContentItemsNumber.bind(null, 4));

    await arc.pec.idle;
    await slotComposer.expectationsCompleted();

    // Replan and verify updated suggestions.
    expectedSuggestions = expectedSuggestions.map(suggestion => {
      return suggestion.replace(/products from your browsing context/g, 'my short list')
                       .replace('Minecraft Book plus 2 other items', 'Minecraft Book plus 3 other items');
    });
    plans = await makePlans(arc, expectedSuggestions);
    assert.equal(plans.length, 4);

    //var giftView = arc.findHandlesByType(Product.type.setViewOf(), {tag: "giftlist"})[0];
    //await testUtil.assertViewHas(giftView, Product, "name",
    //    ["Tea Pot", "Bee Hive", "Denim Jeans", "Arduino Starter Pack"]);

    // var serialization = arc.serialize();

    //slotComposer
    //           .expectGetSlot("ShowItems", "root")
    //           .expectGetSlot("Chooser", "action")
    //           .expectRender("ShowItems")
    //           .expectRender("Chooser")
    //           .expectRender("ShowItems")
    //           .expectRender("Chooser")
    //           ;
    //
    // var arcMap = new Map();
    // for (let relatedArc of relatedArcs) {
    //   arcMap.set(relatedArc.id, relatedArc);
    // }
    //
    //var newArc = Arc.deserialize({serialization, loader, slotComposer, arcMap});
    // await slotComposer.expectationsCompleted();
    //
    // productViews = arc.findHandlesByType(Product.type.setViewOf());
    //assert.equal(productViews.length, 5);
    //var giftView = arc.findHandlesByType(Product.type.setViewOf(), {tag: "gift list"})[0];
    //await testUtil.assertViewHas(giftView, Product, "name",
    //    ["Tea Pot", "Bee Hive", "Denim Jeans", "Arduino Starter Pack"]);
  });
});
