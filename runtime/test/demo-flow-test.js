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

require("./trace-setup.js");

class Person extends runtime.Entity {
  constructor(name) {
    super();
    this._data = {name};
  }

  get data() { return this._data; }

  static get key() { return "Person"; }
}

class Product extends runtime.Entity {
    constructor(name) {
    super();
    this._data = {name};
  }

  get data() { return this._data; }

  static get key() { return "Product"; }
}

function prepareExtensionArc() {
  let scope = new runtime.Scope();
  systemParticles.register(scope);
  var arc = new Arc(scope);
  var personView = scope.createView(scope.typeFor(Person).viewOf(scope), "peopleFromWebpage");
  var productView = scope.createView(scope.typeFor(Product).viewOf(scope), "productsFromWebpage");
  var personSlot = scope.createView(scope.typeFor(Person), "personSlot");
  arc.addView(personView);
  arc.addView(productView);
  arc.addView(personSlot);
  scope.commit([new Person("Claire"), new Product("Tea Pot"), new Product("Bee Hive"), new Product("Denim Jeans")]);
  return arc;
}

describe('demo flow', function() {
  it('flows like a demo', function(done) {
    let arc = prepareExtensionArc();
    // TODO: add a loader to the scope so this fallback can happen automatically.
    ['Create', 'Recommend', 'Save', 'WishlistFor'].forEach(name => {
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
      .build();
    var suggestinator = new Suggestinator();
    suggestinator._getSuggestions = a => [r];
    var results = suggestinator.suggestinate(arc);
    results.then(r => { console.log(r); done(); })
  });
});
