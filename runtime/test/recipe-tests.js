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


const Foo = runtime.loader.loadEntity("Foo");
const Bar = runtime.loader.loadEntity("Bar");

describe('recipe', function() {

  it('recipes can load', async () => {
    let scope = new runtime.Scope();
    particles.register(scope);
    var arc = new Arc(scope);
    let fooView = arc.createView(scope.typeFor(Foo));
    let barView = arc.createView(scope.typeFor(Bar));

    var r = new recipe.RecipeBuilder()
        .addParticle("TestParticle")
            .connectView("foo", fooView)
            .connectView("bar", barView)
        .build();

    r.instantiate(arc);
    viewlet.viewletFor(fooView).set(new Foo({value: "not a Bar"}));
    await util.assertSingletonHas(barView, Bar, "not a Bar1");
  });
});
