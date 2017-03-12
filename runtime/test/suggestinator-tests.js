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
var Suggestinator = require("../suggestinator.js");
var Arc = require("../arc.js");
var Resolver = require("../resolver.js");
var recipe = require("../recipe.js");
let assert = require('chai').assert;


var Foo = runtime.testing.testEntityClass('Foo');
var Bar = runtime.testing.testEntityClass('Bar');
var Far = runtime.testing.testEntityClass('Far');

describe('suggestinator', function() {

  it('suggests a ranked list of recipes', function() {
    let scope = new runtime.Scope();

    var recipe1 = new recipe.RecipeBuilder()
        .addParticle("TestParticle")
            .connect("foo", {atomicTypeName: "Foo", mustCreate: false})
            .connect("bar", {atomicTypeName: "Bar", mustCreate: false})
        .build();

    var recipe2 = new recipe.RecipeBuilder()
        .addParticle("TwoInputTestParticle")
            .connect("foo", {atomicTypeName: "Foo", mustCreate: false})
            .connect("bar", {atomicTypeName: "Bar", mustCreate: false})
            .connect("far", {atomicTypeName: "Far", mustCreate: true})
        .build();

    var suggestinator = new Suggestinator();
    suggestinator._getSuggestions = a => [recipe1, recipe2];
    scope.commit([new Foo("a Foo"), new Bar("a Bar")]);

    var results = suggestinator.suggestinate(new Arc(scope));
    assert.equal(results.length, 2);
    assert.equal(results[0].rank, 0.6);
    assert.equal(results[1].rank, 1.8);
    assert.equal(results[0].components[0].particleName, "TwoInputTestParticle");
    assert.equal(results[1].components[0].particleName, "TestParticle");
  });

});
