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
const Description = require("../description.js");
const Manifest = require("../manifest.js");
const Loader = require("../loader.js");
const assert = require('chai').assert;
const Planner = require('../planner.js');
const testUtil = require('./test-util.js');
const MockSlotComposer = require('./mock-slot-composer.js');

describe('demo flow', function() {
  it('flows like a demo', async function() {
    let loader = new Loader();
    let pecFactory = null;
    var slotComposer = new MockSlotComposer();
    let arc = new Arc({
      id: 'demo',
      pecFactory,
      slotComposer,
      context: await Manifest.load('browser/demo/recipes.manifest', loader),
    });
    let Product = arc.context.findSchemaByName('Product').entityClass();

    slotComposer.pec = arc.pec;
    let planner = new Planner();
    planner.init(arc);

    let plans = await planner.suggest();
    assert.equal(plans.length, 2);

    // Choose a plan to test with.
    let expectedPlanString = `recipe
  create as view0 # Product List
  copy 'manifest:browser/demo/recipes.manifest:view0' #shortlist as view1 # Product List
  map 'manifest:browser/demo/recipes.manifest:view1' #wishlist as view2 # Product List
  slot 'rootslotid-root' as slot3
  AlsoOn as particle0
    choices <- view0
    list <- view1
    consume set of annotation as slot2
  Chooser as particle1
    choices <- view0
    resultList = view1
    consume action as slot0
      provide set of annotation as slot1
  Recommend as particle2
    known <- view1
    population <- view2
    recommendations -> view0
  ShowProducts as particle3
    list <- view1
    consume root as slot3
      provide action as slot0
      provide set of annotation as slot2
      provide postamble as slot4
      provide preamble as slot5`;
    let {plan} = plans.find(p => p.plan.toString() == expectedPlanString);
    assert(plan);

    assert.equal("Show products from your browsing context (<b>Minecraft Book</b> plus <b>2</b> other items) and " +
                 "Choose from Products recommended based on products from your browsing context and " +
                 "Claire\'s wishlist (<b>Book: How to Draw</b> plus <b>2</b> other items).",
                 Description.getSuggestion(plan, arc));

    slotComposer
      .newExpectations()
        .expectRenderSlot("ShowProducts", "root", ["template"])
      .newExpectations()
        .expectRenderSlot("ShowProducts", "root", ["model"])
        .expectRenderSlot("Chooser", "action", ["template", "model"])
        .expectRenderSlot("AlsoOn", "annotation", ["template", "model"])
        .thenSend("Chooser", "action", "_onChooseValue", {key: "1"})
      .newExpectations()
        .expectRenderSlot("ShowProducts", "root", ["model"])
        .expectRenderSlot("Chooser", "action", ["model"])
        .expectRenderSlot("AlsoOn", "annotation", ["model"]);

    arc.instantiate(plan);
    await arc.pec.idle;

    await slotComposer.expectationsCompleted();

    let productViews = arc.findViewsByType(Product.type.viewOf());
    assert.equal(productViews.length, 2);

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
    //
    // var arcMap = new Map();
    // for (let relatedArc of relatedArcs) {
    //   arcMap.set(relatedArc.id, relatedArc);
    // }
    //
    //var newArc = Arc.deserialize({serialization, loader, slotComposer, arcMap});
    // await slotComposer.expectationsCompleted();
    //
    // productViews = arc.findViewsByType(Product.type.viewOf());
    //assert.equal(productViews.length, 5);
    //var giftView = arc.findViewsByType(Product.type.viewOf(), {tag: "gift list"})[0];
    //await testUtil.assertViewHas(giftView, Product, "name",
    //    ["Tea Pot", "Bee Hive", "Denim Jeans", "Arduino Starter Pack"]);
  });
});
