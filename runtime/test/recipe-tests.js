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
var Resolver = require("../resolver.js");
var recipe = require("../recipe.js");
let assert = require('chai').assert;
let particles = require('./test-particles.js');


var Foo = runtime.testing.testEntityClass('Foo');
var Bar = runtime.testing.testEntityClass('Bar');

describe('recipe', function() {

  it('recipes can load', function() {
    let scope = new runtime.Scope();
    [Foo, Bar].map(a => scope.registerEntityClass(a));
    particles.register(scope);
    var arc = new Arc(scope);
    var r = new recipe.RecipeBuilder()
        .addParticle("TestParticle")
            .connectView("foo", runtime.testing.viewFor(Foo, scope))
            .connectView("bar", runtime.testing.viewFor(Bar, scope))
        .build();

    r.instantiate(arc);
    scope.commitSingletons([new Foo("not a Bar")]);
    arc.tick();
    assert.equal(runtime.testing.viewFor(Bar, scope).data.data, "not a Bar1");
  });
});
