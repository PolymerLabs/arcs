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

class Person extends data.Entity {
  constructor(name) {
    super();
    this._data = {name};
  }

  get data() { return this._data; }
}
Person.type = data.internals.Type.generate();

class Product extends data.Entity {
    constructor(name) {
    super();
    this._data = {name};
  }

  get data() { return this._data; }
}
Product.type = data.internals.Type.generate();

function prepareExtensionArc() {
  var arc = new Arc();
  var personView = data.internals.viewFor(Person.type);
  var productView = data.internals.viewFor(Product.type);
  arc.addView(personView);
  arc.addView(productView);
  data.internals.commit([new Person("Claire"), new Product("Tea Pot"), new Product("Bee Hive"), new Product("Denim Jeans")])
}

describe('demo flow', function() {
  it('flows like a demo', function() {
    prepareExtensionArc();
  });
});