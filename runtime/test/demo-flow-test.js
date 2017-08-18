/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
 "use strict";

const Arc = require("../arc.js");
const Manifest = require("../arc.js");
const Loader = require("../loader.js");
const assert = require('chai').assert;
const Planner = require('../planner.js');
const testUtil = require('./test-util.js');
const MockSlotComposer = require('./mock-slot-composer.js');

require("./trace-setup.js");

describe('demo flow', function() {
  it.skip('flows like a demo', async function() {
    let loader = new Loader();
    let pecFactory = null;
    var slotComposer = new MockSlotComposer();
    let arc = new Arc({
      id: 'demo',
      pecFactory,
      slotComposer,
      context: await Manifest.load('browser/demo/recipes.manifest', loader),
    });
    slotComposer.pec = arc.pec;
    let planner = new Planner();
    context.recipes = [context.recipes[2]];
    planner.init(arc, context);

    let plans = await planner.suggest();

    assert.equal(plans.length, 26);

    // Choose a plan to test with.
    let expectedPlanString = `recipe
  create as view0 # Product List
  map 'page-arc:2' as view1 # Product List
  map 'claires-wishlist-arc:1' as view2 # Product List
  Chooser as particle0
    choices <- view0
    resultList -> view1
    consume action as slot0
  Recommend as particle1
    known <- view1
    population <- view2
    recommendations -> view0
  ShowProducts as particle2
    list <- view1
    consume root
      provide action as slot0
      provide annotation1 as slot1
      provide annotation2 as slot2
      provide annotation3 as slot3
      provide postamble as slot4
      provide preamble as slot5`;
    console.log(plans[22].toString());
    let {plan, description} = plans.find(p => p.plan.toString() == expectedPlanString);
    assert(plan);

    // TODO: description missing "from your browsing context" and "Claire's wishlist" view descriptions - should be extracted from the arc.
    assert.equal("Show Product List (<b>Minecraft Book</b> and <b>2</b> other items) and " +
                 "Choose from Products recommended based on Product List (<b>Minecraft Book</b> and <b>2</b> other items) " +
                 "and Product List (<b>Book: How to Draw</b> and <b>2</b> other items)",
                 description);

    slotComposer
      .expectRenderSlot("ShowProducts", "root", ["template", "model"])
      .expectRenderSlot("Chooser", "action", ["template", "model"])
         .thenSend("Chooser", "action", "_onChooseValue", {key: "1"})
      .expectRenderSlot("Chooser", "action", ["model"])
      .expectRenderSlot("ShowProducts", "root", ["model"]);


    arc.instantiate(plan);
    await arc.pec.idle;

    await slotComposer.expectationsCompleted();

    let productViews = arc.findViewsByType(Product.type.viewOf());
    assert.equal(productViews.length, 3);

    //var giftView = arc.findViewsByType(Product.type.viewOf(), {tag: "giftlist"})[0];
    //await testUtil.assertViewHas(giftView, Product, "name",
    //    ["Tea Pot", "Bee Hive", "Denim Jeans", "Arduino Starter Pack"]);

    var serialization = arc.serialize();

    //slotComposer
    //           .expectGetSlot("ShowProducts", "root")
    //           .expectGetSlot("Chooser", "action")
    //           .expectRender("ShowProducts")
    //           .expectRender("Chooser")
    //           .expectRender("ShowProducts")
    //           .expectRender("Chooser")
    //           ;

    var arcMap = new Map();
    for (let relatedArc of relatedArcs) {
      arcMap.set(relatedArc.id, relatedArc);
    }

    //var newArc = Arc.deserialize({serialization, loader, slotComposer, arcMap});
    //await slotComposer.expectationsCompleted();

    //productViews = arc.findViewsByType(Product.type.viewOf());
    //assert.equal(productViews.length, 5);
    //var giftView = arc.findViewsByType(Product.type.viewOf(), {tag: "gift list"})[0];
    //await testUtil.assertViewHas(giftView, Product, "name",
    //    ["Tea Pot", "Bee Hive", "Denim Jeans", "Arduino Starter Pack"]);
  });
});
