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
var loader = require("../loader.js");
let assert = require('chai').assert;
let particles = require('./test-particles.js');


var Foo = runtime.testing.testEntityClass('Foo');
var Bar = runtime.testing.testEntityClass('Bar');

describe('resolver', function() {

  it('can resolve a partially constructed recipe', function() {
    let scope = new runtime.Scope();
    particles.register(scope);
    var arc = new Arc(scope);
    var r = new recipe.RecipeBuilder()
        .addParticle("TestParticle")
            .connect("foo", {typeName: "Foo", mustCreate: false})
            .connect("bar", {typeName: "Bar", mustCreate: true})
        .build();
    scope.commit([new Foo("not a Bar")]);
    new Resolver().resolve(r, arc);
    r.instantiate(arc);
    arc.tick();
    assert.equal(runtime.testing.viewFor(Bar, scope).data.length, 1);
    assert.equal(runtime.testing.viewFor(Bar, scope).data[0].data, "not a Bar1");
  });

  it('can resolve a recipe from a particles spec', function() {
    let scope = new runtime.Scope();
    particles.register(scope);
    var arc = new Arc(scope);
    var r = particles.TestParticle.spec.buildRecipe();
    scope.commit([new Foo("not a Bar")]);
    scope.createViewForTesting(scope.typeFor(Bar));
    new Resolver().resolve(r, arc);
    r.instantiate(arc);
    arc.tick();
    assert.equal(runtime.testing.viewFor(Bar, scope).data.length, 1);
    assert.equal(runtime.testing.viewFor(Bar, scope).data[0].data, "not a Bar1");    
  });
});
