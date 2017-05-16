/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

const runtime = require("../runtime.js");
const Arc = require("../arc.js");
const BrowserLoader = require("../browser-loader.js");
const Suggestinator = require("../suggestinator.js");
const recipe = require('../recipe.js');
const systemParticles = require('../system-particles.js');
const tracing = require('tracelib');
const OuterPec = require('../outer-PEC');
tracing.enable();

function prepareExtensionArc() {
  let loader = new BrowserLoader('../');
  systemParticles.register(loader);
  let Person = loader.loadEntity("Person");
  let Product = loader.loadEntity("Product");
  // TODO: Move this to a separate file.
  let pecFactory = function(id) {
    let channel = new MessageChannel();
    let worker = new Worker('../build/worker-entry.js');
    worker.postMessage({id: `${id}:inner`, base: '../'}, [channel.port1]);
    return new OuterPec(channel.port2, `${id}:outer`);
  }
  var arc = new Arc({loader, pecFactory});
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
