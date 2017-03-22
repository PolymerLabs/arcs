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
var runtime = require("../runtime.js");
var Arc = require("../arc.js");
var recipe = require("../recipe.js");
let assert = require('chai').assert;
let particles = require('./test-particles.js');

var Foo = runtime.testing.testEntityClass('Foo');
var Bar = runtime.testing.testEntityClass('Bar');

describe('speculator', function() {
  it('can speculatively produce a relevance', function() {
    let scope = new runtime.Scope();
    particles.register(scope);
    var arc = new Arc(scope);
    var r = new recipe.RecipeBuilder()
        .addParticle("TestParticle")
            .connectView("foo", runtime.testing.viewFor(Foo, scope))
            .connectView("bar", runtime.testing.viewFor(Bar, scope))
        .build();
    var speculator = new Speculator();
    scope.commitSingletons([new Foo("not a Bar")])
    var relevance = speculator.speculate(arc, r);
    assert.equal(relevance, 1.8);
    assert.equal(runtime.testing.viewFor(Bar, scope).data, undefined);
  });
});
