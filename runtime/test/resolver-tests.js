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
let systemParticles = require('../system-particles.js');

require("./trace-setup.js");

let scope = new runtime.Scope();
var Foo = runtime.testing.testEntityClass('Foo');
var Bar = runtime.testing.testEntityClass('Bar');

[Foo, Bar].map(a => scope.registerEntityClass(a));

describe('resolver', function() {
  it('can resolve a partially constructed recipe', function(done) {
    particles.register(scope);
    var arc = new Arc(scope);
    let fooView = scope.createView(scope.typeFor(Foo));
    var r = new recipe.RecipeBuilder()
        .addParticle("TestParticle")
            .connectSpec("foo", {typeName: "Foo", mustCreate: false})
            .connectSpec("bar", {typeName: "Bar", mustCreate: true})
        .build();
    fooView.set(new Foo("not a Bar"));
    assert(new Resolver().resolve(r, arc), "recipe resolves");
    r.instantiate(arc);
    var barView = scope.findViews(scope.typeFor(Bar))[0];
    barView.on('change', () => {assert.equal(barView.get().data, "not a Bar1"); done();}, this);
  });

  it("can resolve a recipe from a particle's spec", function(done) {
    let scope = new runtime.Scope();
    particles.register(scope);
    var arc = new Arc(scope);
    var r = particles.TestParticle.spec.buildRecipe();
    let fooView = scope.createView(scope.typeFor(Foo));
    let barView = scope.createView(scope.typeFor(Bar));
    fooView.set(new Foo("not a Bar"));
    new Resolver().resolve(r, arc);
    r.instantiate(arc);
    barView.on('change', () => {assert.equal(barView.get().data, "not a Bar1"); done();}, this);
  });

  it('can resolve a recipe that is just a particle name', function(done) {
    let scope = new runtime.Scope();
    particles.register(scope);
    var arc = new Arc(scope);
    var r = new recipe.RecipeBuilder().addParticle("TestParticle").build();
    let fooView = scope.createView(scope.typeFor(Foo));
    let barView = scope.createView(scope.typeFor(Bar));
    fooView.set(new Foo("not a Bar"));
    new Resolver().resolve(r, arc);
    r.instantiate(arc);
    barView.on('change', () => {assert.equal(barView.get().data, "not a Bar1"); done();}, this);
  });

  it("won't resolve a recipe that mentions connections that are not in a particle's connection list", function() {
    particles.register(scope);
    var arc = new Arc(scope);
    var r = new recipe.RecipeBuilder()
        .addParticle("TestParticle")
            .connectSpec("herp", {typeName: "Foo", mustCreate: false})
        .build();
    assert(!new Resolver().resolve(r, arc), "recipe should not resolve");
  });

  it.skip("will match particle constraints to build a multi-particle arc", function() {
    particles.register(scope);
    systemParticles.register(scope);
    var arc = new Arc(scope);
    var r = new recipe.RecipeBuilder()
        .addParticle("Demuxer")
            .connectConstraint("singleton", "shared")
        .addParticle("TestParticle")
            .connectConstraint("foo", "shared")
        .build();
    scope.commit([new Foo(1), new Foo(2), new Foo(3)]);
    assert(new Resolver().resolve(r, arc), "recipe should resolve");
    r.instantiate(arc);
    arc.tick(); arc.tick();
    assert.equal(runtime.testing.viewFor(Bar, scope).data.data, 2);
    arc.tick();
    assert.equal(runtime.testing.viewFor(Bar, scope).data.data, 3);

  })
});
