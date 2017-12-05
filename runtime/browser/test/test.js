/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

const runtime = require("../../runtime.js");
const Arc = require("../../arc.js");
const BrowserLoader = require("../../browser-loader.js");
const SlotComposer = require('../../slot-composer.js');
const tracing = require('../../../tracelib/trace.js');
tracing.enable();

function prepareExtensionArc() {
  let loader = new BrowserLoader('../../');
  let Person = loader.loadEntity("Person");
  let Product = loader.loadEntity("Product");
  // TODO: Move this to a separate file.
  let pecFactory = require('../worker-pec-factory.js').bind(null, '../');
  var domRoot = global.document ? document.querySelector('[particle-container]') || document.body : {};
  var slotComposer = new SlotComposer({rootContext: domRoot, affordance: 'mock'});
  var arc = new Arc({pecFactory, slotComposer});
  var personView = arc.createView(Person.type.setViewOf(), "peopleFromWebpage");
  var productView = arc.createView(Product.type.setViewOf(), "productsFromWebpage");
  var personSlot = arc.createView(Person.type, "personSlot");
  arc.commit([new Person({name: "Claire"}), new Product({name: "Tea Pot"}), new Product({name: "Bee Hive"}),
              new Product({name: "Denim Jeans"})]);
  return {arc, slotComposer};
}

let {arc, slotComposer}  = prepareExtensionArc();
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
  .addParticle("ShowProducts")
    .connectConstraint("list", "list")
  .addParticle("Chooser")
    .connectConstraint("choices", "recommended")
    .connectConstraint("resultList", "list")
  // Uncomment this to test MultiChooser particle.
  // .addParticle("MultiChooser")
  //   .connectConstraint("choices", "wishlist")
  //   .connectConstraint("resultList", "list")
  .build();
var suggestinator = new Suggestinator();
suggestinator._getSuggestions = a => [r];
var results = suggestinator.suggestinate(arc);
results.then(r => {
  console.log(r);
  window.trace = tracing.save();
  arc.instantiate(r[0]);
})
