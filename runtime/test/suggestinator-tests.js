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
let particles = require('./test-particles.js');


var Foo = runtime.testing.testEntityClass('Foo');
var Bar = runtime.testing.testEntityClass('Bar');
var Far = runtime.testing.testEntityClass('Far');

describe('suggestinator', function() {

  it('suggests a ranked list of recipes', async () => {
    let scope = new runtime.Scope();
    particles.register(scope);

    var arc = new Arc(scope);

    var fooView = arc.createView(scope.typeFor(Foo));
    var barView = arc.createView(scope.typeFor(Bar));

    var recipe1 = new recipe.RecipeBuilder()
        .addParticle("TestParticle")
            .connectSpec("foo", {typeName: "Foo", mustCreate: false})
            .connectSpec("bar", {typeName: "Bar", mustCreate: false})
        .build();

    var recipe2 = new recipe.RecipeBuilder()
        .addParticle("TwoInputTestParticle")
            .connectSpec("foo", {typeName: "Foo", mustCreate: false})
            .connectSpec("bar", {typeName: "Bar", mustCreate: false})
            .connectSpec("far", {typeName: "Far", mustCreate: true})
        .build();

    var suggestinator = new Suggestinator();
    suggestinator._getSuggestions = a => [recipe1, recipe2];
    fooView.set(new Foo("a Foo"));
    barView.set(new Bar("a Bar"));

    var results = await suggestinator.suggestinate(arc);
    assert.equal(results.length, 2);
    // This is 0.36 because 2 views get updated & therefore TITP gets called twice.
    // That's probably wrong.
    // We should probably fix it.
    assert.equal(results[0].rank, 0.36);
    assert.equal(results[1].rank, 1.8);
    assert.equal(results[0].components[0].particleName, "TwoInputTestParticle");
    assert.equal(results[1].components[0].particleName, "TestParticle");
  });

});
