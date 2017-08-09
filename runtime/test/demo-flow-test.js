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
const Loader = require("../loader.js");
const assert = require('chai').assert;
const Planner = require('../planner.js');
const testUtil = require('./test-util.js');
const MockSlotComposer = require('./mock-slot-composer.js');
const demoContext = require('../browser/demo/demo-context-factory.js');

require("./trace-setup.js");

describe('demo flow', function() {
  it('flows like a demo', async function() {
    let loader = new Loader();
    let pecFactory = null;
    let slotComposer = null;
    let {relatedArcs, arc, Person, Product, context} = await demoContext({
      loader, pecFactory, slotComposer,
    });
    let planner = new Planner();
    context.recipes = [context.recipes[2]];
    planner.init(arc, context);
    // TODO: planner.suggest intead of planner.plan
    let plans = await planner.plan();

    assert.equal(7, plans.length);
    // assert.equal("Show Product List from your browsing context (<b>Tea Pot</b> and <b>2</b> other items) and " +
    //              "Choose from Products recommended based on Product List from your browsing context (<b>Tea Pot</b> and <b>2</b> other items) " +
    //              "and Claire's wishlist (<b>Book: How to Draw</b> and <b>2</b> other items)",
    //              r[0].descriptinator.description);

    //var slotComposer = new MockSlotComposer(arc.pec);
    //slotComposer
    //    .expectGetSlot("Chooser", "action")
    //    .expectGetSlot("ShowProducts", "root")

    //    .expectRender("Chooser")
    //    .expectRender("ShowProducts")
    //    .expectRender("Chooser")
    //    .expectRender("ShowProducts")

    //    .thenSend("action", "_onChooseValue", {key: "1"})

    //    .expectRender("ShowProducts")
    //    .expectRender("Chooser");

    //arc.pec.slotComposer = slotComposer;
    plans[0].instantiate(arc);
    await arc.pec.idle;

    //await slotComposer.expectationsCompleted();

    let productViews = arc.findViews(Product.type.viewOf());
    assert.equal(productViews.length, 5);

    //var giftView = arc.findViews(Product.type.viewOf(), {tag: "giftlist"})[0];
    //await testUtil.assertViewHas(giftView, Product, "name",
    //    ["Tea Pot", "Bee Hive", "Denim Jeans", "Arduino Starter Pack"]);

    var serialization = arc.serialize();
    //systemParticles.register(loader);

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

    var newArc = Arc.deserialize({serialization, loader, slotComposer, arcMap});
    //await slotComposer.expectationsCompleted();

    productViews = arc.findViews(Product.type.viewOf());
    assert.equal(productViews.length, 5);
    //var giftView = arc.findViews(Product.type.viewOf(), {tag: "gift list"})[0];
    //await testUtil.assertViewHas(giftView, Product, "name",
    //    ["Tea Pot", "Bee Hive", "Denim Jeans", "Arduino Starter Pack"]);
  });
});
