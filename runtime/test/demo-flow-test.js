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
var systemParticles = require('../system-particles.js');
let assert = require('chai').assert;
const testUtil = require('./test-util.js');
const MockSlotManager = require('./mock-slot-manager.js');

require("./trace-setup.js");

function prepareExtensionArc() {
  let loader = new Loader();
  let Person = loader.loadEntity("Person");
  let Product = loader.loadEntity("Product");
  var arc = new Arc({loader});
  systemParticles.register(loader);
  var personView = arc.createView(Person.type.viewOf(), "peopleFromWebpage");
  var productView = arc.createView(Product.type.viewOf(), "productsFromWebpage");
  var personSlot = arc.createView(Person.type, "personSlot");
  arc.commit([new Person({name: "Claire"}), new Product({name: "Tea Pot"}), new Product({name: "Bee Hive"}), 
              new Product({name: "Denim Jeans"})]);
  return {arc, Person, Product};
}

describe('demo flow', function() {
  it('flows like a demo', function(done) {
    let {arc, Person, Product} = prepareExtensionArc();
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
      console.log(r);
      var productViews = arc.findViews(Product.type.viewOf());
      assert.equal(productViews.length, 1);
      await testUtil.assertViewHas(productViews[0], Product, "name", ["Tea Pot", "Bee Hive", "Denim Jeans"]);
      var slotManager = new MockSlotManager(arc.pec);
      slotManager.expectGetSlot("ListView", "root")
                 .expectGetSlot("Chooser", "action")
                 .expectRender("ListView")
                 .expectRender("Chooser")
                 .expectRender("Chooser")
                 .expectRender("Chooser")
                 .thenSend("action", "chooseValue", {key: "1"})
                 .expectRender("ListView")
                 .expectRender("Chooser");

      arc.pec.slotManager = slotManager;
      r[0].instantiate(arc);
      await slotManager.expectationsCompleted();
      productViews = arc.findViews(Product.type.viewOf());
      assert.equal(productViews.length, 4);
      await testUtil.assertViewHas(productViews[1], Product, "name",
          ["Tea Pot", "Bee Hive", "Denim Jeans", "Arduino"]);

      done();
    });

  });
});
