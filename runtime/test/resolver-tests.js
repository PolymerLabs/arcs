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
let systemParticles = require('../system-particles.js');
let util = require('./test-util.js');
var viewlet = require('../viewlet.js');
let SlotComposer = require('../slot-composer.js');

require("./trace-setup.js");

let loader = new (require('../loader'));
systemParticles.register(loader);
particles.register(loader);
const slotComposer = new SlotComposer({});
const Foo = loader.loadEntity("Foo");
const Bar = loader.loadEntity("Bar");

describe('resolver', () => {
  it('can resolve a partially constructed recipe', async () => {
    var arc = new Arc({loader, slotComposer});
    let fooView = arc.createView(Foo.type);
    var r = new recipe.RecipeBuilder()
        .addParticle("TestParticle")
            .connectSpec("foo", {typeName: "Foo", mustCreate: false})
            .connectSpec("bar", {typeName: "Bar", mustCreate: true})
        .build();
    viewlet.viewletFor(fooView).set(new Foo({value: "not a Bar"}));
    assert(Resolver.resolve(r, arc), "recipe resolves");
    r.instantiate(arc);
    var barView = arc.findViews(Bar.type)[0];
    await util.assertSingletonHas(barView, Bar, "not a Bar1");
  });

  it("can resolve a recipe from a particle's spec", async () => {
    var arc = new Arc({loader, slotComposer});
    var r = particles.TestParticle.spec.buildRecipe();
    let fooView = arc.createView(Foo.type);
    let barView = arc.createView(Bar.type);
    viewlet.viewletFor(fooView).set(new Foo({value: "not a Bar"}));
    Resolver.resolve(r, arc);
    r.instantiate(arc);
    await util.assertSingletonHas(barView, Bar, "not a Bar1");
  });

  it('can resolve a recipe that is just a particle name', async () => {
    var arc = new Arc({loader, slotComposer});
    var r = new recipe.RecipeBuilder().addParticle("TestParticle").build();
    let fooView = arc.createView(Foo.type);
    let barView = arc.createView(Bar.type);
    viewlet.viewletFor(fooView).set(new Foo({value: "not a Bar"}));
    Resolver.resolve(r, arc);
    r.instantiate(arc);
    await util.assertSingletonHas(barView, Bar, "not a Bar1");
  });

  it("won't resolve a recipe that mentions connections that are not in a particle's connection list", function() {
    var arc = new Arc({loader, slotComposer});
    var r = new recipe.RecipeBuilder()
        .addParticle("TestParticle")
            .connectSpec("herp", {typeName: "Foo", mustCreate: false})
        .build();
    assert(!Resolver.resolve(r, arc), "recipe should not resolve");
  });

  it.skip("will match particle constraints to build a multi-particle arc", function() {
    var arc = new Arc({loader, slotComposer});
    var r = new recipe.RecipeBuilder()
        .addParticle("Demuxer")
            .connectConstraint("singleton", "shared")
        .addParticle("TestParticle")
            .connectConstraint("foo", "shared")
        .build();
    arc.commit([new Foo({value: 1}), new Foo({value: 2}), new Foo({value: 3})]);
    assert(Resolver.resolve(r, arc), "recipe should resolve");
    r.instantiate(arc);
    arc.tick(); arc.tick();
    assert.equal(runtime.testing.viewFor(Bar).data.data, 2);
    arc.tick();
    assert.equal(runtime.testing.viewFor(Bar).data.data, 3);
  })
});
