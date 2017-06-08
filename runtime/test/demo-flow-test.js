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

var runtime = require("../runtime.js");
var Arc = require("../arc.js");
var Loader = require("../loader.js");
var Suggestinator = require("../suggestinator.js");
var recipe = require('../recipe.js');
var SlotComposer = require('../slot-composer.js');
var systemParticles = require('../system-particles.js');
let assert = require('chai').assert;
const testUtil = require('./test-util.js');
const MockSlotComposer = require('./mock-slot-composer.js');

require("./trace-setup.js");

function prepareExtensionArc() {
  let loader = new Loader();
  let Person = loader.loadEntity("Person");
  let Product = loader.loadEntity("Product");
  var pageArc = new Arc({loader, id: "pageArc"});

  var personView = pageArc.createView(Person.type.viewOf(), "peopleFromWebpage");
  var productView = pageArc.createView(Product.type.viewOf(), "productsFromWebpage");
  pageArc.commit([
    new Person({name: "Claire"}),
    new Product({name: "Tea Pot"}),
    new Product({name: "Bee Hive"}),
    new Product({name: "Denim Jeans"})
  ]);

  let slotComposer = new SlotComposer();

  var arc = new Arc({loader, slotComposer, id: "mainArc"});
  systemParticles.register(loader);
  arc.mapView(personView);
  arc.mapView(productView);
  var personSlot = arc.createView(Person.type, "personSlot");

  return {pageArc, arc, Person, Product};
}

describe('demo flow', function() {
  it('flows like a demo', function(done) {
    let {pageArc, arc, Person, Product} = prepareExtensionArc();
    var r = new recipe.RecipeBuilder()
      .addParticle("Create")
        .connectConstraint("newList", "list")
      .addParticle("Create")
        .connectConstraint("newList", "recommended")
      .addParticle("WishlistFor")
        .connectConstraint("wishlist", "wishlist")
        .connectConstraint("person", "person")
      .addParticle("Recommend")
        .connectConstraint("known", "list")
        .connectConstraint("population", "wishlist")
        .connectConstraint("recommendations", "recommended")
      .addParticle("SaveList")
        .connectConstraint("list", "list")
      .addParticle("Choose")
        .connectConstraint("singleton", "person")
      .addParticle("ListView")
        .connectConstraint("list", "list")
      .addParticle("Chooser")
        .connectConstraint("choices", "recommended")
        .connectConstraint("resultList", "list")
      .build();

    var productViews = arc.findViews(Product.type.viewOf());
    assert.equal(productViews.length, 1);

    var suggestinator = new Suggestinator();
    suggestinator._getSuggestions = a => [r];

    var results = suggestinator.suggestinate(arc);
    results.then(async r => {
      var productViews = arc.findViews(Product.type.viewOf());
      assert.equal(productViews.length, 1);
      await testUtil.assertViewHas(productViews[0], Product, "name", ["Tea Pot", "Bee Hive", "Denim Jeans"]);
      var slotComposer = new MockSlotComposer(arc.pec);
      slotComposer
                 .expectGetSlot("Chooser", "action")
                 .expectGetSlot("ListView", "root")

                 .expectRender("Chooser")
                 .expectRender("ListView")
                 .expectRender("Chooser")
                 .expectRender("ListView")

                 .thenSend("action", "_onChooseValue", {key: "1"})

                 .expectRender("ListView")
                 .expectRender("Chooser")
                 ;

      arc.pec.slotComposer = slotComposer;
      r[0].instantiate(arc);
      await slotComposer.expectationsCompleted();

      productViews = arc.findViews(Product.type.viewOf());
      assert.equal(productViews.length, 4);
      await testUtil.assertViewHas(productViews[1], Product, "name",
          ["Tea Pot", "Bee Hive", "Denim Jeans", "Arduino"]);

      var serialization = arc.serialize();
      var loader = new Loader();
      systemParticles.register(loader);

      slotComposer
                 .expectGetSlot("ListView", "root")
                 .expectGetSlot("Chooser", "action")
                 .expectRender("ListView")
                 .expectRender("Chooser")
                 .expectRender("ListView")
                 .expectRender("Chooser")
                 .expectRender("Chooser")
                 ;

      var arcMap = new Map();
      arcMap.set(pageArc.id, pageArc);

      var newArc = Arc.deserialize({serialization, loader, slotComposer, arcMap});
      await slotComposer.expectationsCompleted();

      productViews = arc.findViews(Product.type.viewOf());
      assert.equal(productViews.length, 4);
      await testUtil.assertViewHas(productViews[1], Product, "name",
          ["Tea Pot", "Bee Hive", "Denim Jeans", "Arduino"]);

      done();
    });
  });
});
