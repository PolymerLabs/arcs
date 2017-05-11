/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

var runtime = require("../runtime.js");
var Arc = require("../arc.js");
var BrowserLoader = require("../browser-loader.js");
var Suggestinator = require("../suggestinator.js");
var recipe = require('../recipe.js');
var systemParticles = require('../system-particles.js');
var tracing = require('tracelib');
tracing.enable();

function prepareExtensionArc() {
  let loader = new BrowserLoader('../');
  systemParticles.register(loader);
  let Person = loader.loadEntity("Person");
  let Product = loader.loadEntity("Product");
  var arc = new Arc({loader});
  var personView = arc.createView(Person.type.viewOf(), "peopleFromWebpage");
  var productView = arc.createView(Product.type.viewOf(), "productsFromWebpage");
  var personSlot = arc.createView(Person.type, "personSlot");
  arc.commit([new Person({name: "Claire"}), new Product({name: "Tea Pot"}), new Product({name: "Bee Hive"}),
              new Product({name: "Denim Jeans"})]);
  return arc;
}

let arc = prepareExtensionArc();
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
})
