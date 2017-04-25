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
var loader = require("../loader.js");
var Suggestinator = require("../suggestinator.js");
var recipe = require('../recipe.js');
var systemParticles = require('../system-particles.js');
var tracing = require('../../tracelib/trace.js');
tracing.enable();

class SlotManager {
  renderSlot(slotId, content) {
    document.body.textContent = content;
  }
}

function prepareExtensionArc() {
  let Person = loader.loadEntity("Person");
  let Product = loader.loadEntity("Product");
  let scope = new runtime.Scope();
  systemParticles.register(scope);
  var arc = new Arc(scope);
  var personView = arc.createView(scope.typeFor(Person).viewOf(scope), "peopleFromWebpage");
  var productView = arc.createView(scope.typeFor(Product).viewOf(scope), "productsFromWebpage");
  var personSlot = arc.createView(scope.typeFor(Person), "personSlot");
  arc.commit([new Person("Claire"), new Product("Tea Pot"), new Product("Bee Hive"), new Product("Denim Jeans")]);
  return arc;
}

let arc = prepareExtensionArc();
// TODO: add a loader to the scope so this fallback can happen automatically.
['Create', 'Recommend', 'Save', 'WishlistFor', 'ListView'].forEach(name => {
  let particleClass = loader.loadParticle(name);
  arc.scope.registerParticle(particleClass);
});
var r = new recipe.RecipeBuilder()
  .addParticle("Create")
    .connectConstraint("newList", "list")
  .addParticle("WishlistFor")
    .connectConstraint("wishlist", "wishlist")
    .connectConstraint("person", "person")
  .addParticle("Recommend")
    .connectConstraint("known", "list")
    .connectConstraint("population", "wishlist")
    .connectConstraint("recommendations", "list")
  .addParticle("Save")
    .connectConstraint("list", "list")
  .addParticle("Choose")
    .connectConstraint("singleton", "person")
  .addParticle("ListView")
    .connectConstraint("list", "list")
  .build();
var suggestinator = new Suggestinator();
suggestinator._getSuggestions = a => [r];
var results = suggestinator.suggestinate(arc);
results.then(r => { console.log(r); })

window.trace = tracing.save();
