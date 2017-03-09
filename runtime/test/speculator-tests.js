/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

var Speculator = require("../speculator.js");
var data = require("../data-layer.js");
var Arc = require("../arc.js");
var recipe = require("../recipe.js");
let assert = require('chai').assert;

var Foo = data.testing.testEntityClass('Foo');
var Bar = data.testing.testEntityClass('Bar');

describe('speculator', function() {
  it('can speculatively produce a relevance', function() {
    let scope = new data.Scope();
    var arc = new Arc();
    var r = new recipe.RecipeBuilder()
        .addParticle("TestParticle")
            .connect("foo", data.testing.viewFor(Foo, scope))
            .connect("bar", data.testing.viewFor(Bar, scope))
        .build();
    var speculator = new Speculator();
    scope.commit([new Foo("not a Bar")])
    var relevance = speculator.speculate(arc, r);
    assert.equal(relevance, 1.8);
    assert.equal(data.testing.viewFor(Bar, scope).data.length, 0);
  });
});
