/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

var data = require("../data-layer.js");
var Arc = require("../arc.js");
var loader = require("../loader.js");
var Suggestinator = require("../suggestinator.js");

class Person extends data.Entity {
  constructor(name) {
    super();
    this._data = {name};
  }

  get data() { return this._data; }
}

class Product extends data.Entity {
    constructor(name) {
    super();
    this._data = {name};
  }

  get data() { return this._data; }
}

function prepareExtensionArc() {
  let scope = new data.Scope();
  var arc = new Arc(scope);
  var personView = data.testing.viewFor(Person, scope);
  var productView = data.testing.viewFor(Product, scope);
  arc.addView(personView);
  arc.addView(productView);
  scope.commit([new Person("Claire"), new Product("Tea Pot"), new Product("Bee Hive"), new Product("Denim Jeans")]);
  return arc;
}

describe('demo flow', function() {
  it('flows like a demo', function() {
    let arc = prepareExtensionArc();
    var recipes = ["Create", "Recommend", "Save"].map(a => loader.loadRecipe(a, arc.scope));
    var suggestinator = new Suggestinator();
    suggestinator._getSuggestions = a => recipes;
    var results = suggestinator.suggestinate(arc);
    console.log(results);
  });
});
