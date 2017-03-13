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
  var arc = new Arc(scope);
  var personView = runtime.testing.viewFor(Person, scope);
  var productView = runtime.testing.viewFor(Product, scope);
  arc.addView(personView);
  arc.addView(productView);
  scope.commit([new Person("Claire"), new Product("Tea Pot"), new Product("Bee Hive"), new Product("Denim Jeans")]);
  return arc;
}

describe('demo flow', function() {
  it('flows like a demo', function() {
    let arc = prepareExtensionArc();
    let recipes = ['Create', 'Recommend', 'Save'].map(name => {
      let particleClass = loader.loadParticle(name);
      arc.scope.registerParticle(particleClass);
      return particleClass.definition.buildRecipe();
    });
    var suggestinator = new Suggestinator();
    suggestinator._getSuggestions = a => recipes;
    var results = suggestinator.suggestinate(arc);
    console.log(results);
  });
});
