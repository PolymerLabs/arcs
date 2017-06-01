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
let util = require('./test-util.js');
let viewlet = require('../viewlet.js');
let Loader = require('../loader');
let SlotComposer = require('../slot-composer.js');

const slotComposer = new SlotComposer({});

describe('recipe', function() {

  it('recipes can load', async () => {
    let loader = new Loader();
    const Foo = loader.loadEntity("Foo");
    const Bar = loader.loadEntity("Bar");
    particles.register(loader);
    var arc = new Arc({loader, slotComposer});
    let fooView = arc.createView(Foo.type);
    let barView = arc.createView(Bar.type);

    var r = new recipe.RecipeBuilder()
        .addParticle("TestParticle")
            .connectView("foo", fooView)
            .connectView("bar", barView)
        .build();

    r.instantiate(arc);
    viewlet.viewletFor(fooView).set(new Foo({value: "not a Bar"}));
    await util.assertSingletonHas(barView, Bar, "not a Bar1");
  });

  it('find connection', function() {
    var r = new recipe.RecipeBuilder()
        .addParticle("TestParticle")
            .connectConstraint("foo", "fooView")
            .connectConstraint("bar", "barView")
        .build();
    assert.equal("fooView", r.components[0].findConnectionByName("foo").constraintName);
    assert.isUndefined(r.components[0].findConnectionByName("nonexistent"));

    assert.equal("foo", r.components[0].findConnectionByConstraintName("fooView").name);
    assert.isUndefined(r.components[0].findConnectionByConstraintName("nonexistent"));
  });
});
