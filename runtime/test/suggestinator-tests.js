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
  beforeEach(function() { data.testing.trash(); });

  it('suggests a ranked list of recipes', function() {

    var suggestion1 = new recipe.RecipeBuilder()
        .suggest("TestParticle")
            .connect("foo", Foo.type)
            .connect("bar", Bar.type)
        .build();

    var suggestion2 = new recipe.RecipeBuilder()
        .suggest("TwoInputTestParticle")
            .connect("foo", Foo.type)
            .connect("bar", Bar.type)
            .connect("far", Far.type)
        .build();

    var suggestinator = new Suggestinator();
    suggestinator._getSuggestions = a => [suggestion1, suggestion2];
    data.internals.viewFor(Foo.type).store(new Foo("a Foo"));
    data.internals.viewFor(Bar.type).store(new Bar("a Bar"));

    var results = suggestinator.suggestinate(new Arc());
    assert.equal(results[0].rank, 0.6);
    assert.equal(results[1].rank, 1.8);
    assert.equal(results[0].components[0].particleName, "TwoInputTestParticle");
    assert.equal(results[1].components[0].particleName, "TestParticle");
  });

});
