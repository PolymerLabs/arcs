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
var Suggestinator = require("../suggestinator.js");
var Arc = require("../arc.js");
var Resolver = require("../resolver.js");
var recipe = require("../recipe.js");
let assert = require('chai').assert;


var Foo = data.testing.testEntityClass('Foo');
var Bar = data.testing.testEntityClass('Bar');
var Far = data.testing.testEntityClass('Far');

describe('suggestinator', function() {

  it('suggests a ranked list of recipes', function() {
    let scope = new data.Scope();

    var recipe1 = new recipe.RecipeBuilder()
        .addParticle("TestParticle")
            .connect("foo", scope.typeFor(Foo))
            .connect("bar", scope.typeFor(Bar))
        .build();

    var recipe2 = new recipe.RecipeBuilder()
        .addParticle("TwoInputTestParticle")
            .connect("foo", scope.typeFor(Foo))
            .connect("bar", scope.typeFor(Bar))
            .connect("far", scope.typeFor(Far))
        .build();

    var suggestinator = new Suggestinator();
    suggestinator._getSuggestions = a => [recipe1, recipe2];
    scope.commit([new Foo("a Foo"), new Bar("a Bar")]);

    var results = suggestinator.suggestinate(new Arc(scope));
    assert.equal(results[0].rank, 0.6);
    assert.equal(results[1].rank, 1.8);
    assert.equal(results[0].components[0].particleName, "TwoInputTestParticle");
    assert.equal(results[1].components[0].particleName, "TestParticle");
  });

});
