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
let util = require('./test-util.js');
let Loader = require('../loader');

require("./trace-setup.js");

let loader = new Loader();
particles.register(loader);
const Foo = loader.loadEntity("Foo");
const Bar = loader.loadEntity("Bar");

describe('speculator', function() {
  it('can speculatively produce a relevance', async () => {
    var arc = new Arc({loader});
    let fooView = arc.createView(Foo.type);
    let barView = arc.createView(Bar.type);
    var r = new recipe.RecipeBuilder()
        .addParticle("TestParticle")
            .connectView("foo", fooView)
            .connectView("bar", barView)
        .build();
    var speculator = new Speculator();
    console.log(new Foo({value: "not a Bar"}));
    fooView.set(new Foo({value: "not a Bar"}));
    var relevance = await speculator.speculate(arc, r);
    assert.equal(relevance, 1.8);
    await util.assertSingletonEmpty(barView);
  });
});
