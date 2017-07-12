/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
 "use strict";

let Arc = require('../arc.js');
let Loader = require('../loader.js');
let Planner = require('../planner.js');
let assert = require('chai').assert;
let Recipe = require('../new-recipe.js');
let systemParticles = require('../system-particles.js');
let ConvertConstraintsToConnections = require('../strategies/convert-constraints-to-connections.js');

var loader = new Loader();
systemParticles.register(loader);
let Person = loader.loadEntity("Person");
let Product = loader.loadEntity("Product");

describe('Planner', function() {

  it('make a plan', async () => {
    var a = new Arc({id: "test-plan-arc", loader});
    var p = new Planner();
    var population = await(p.plan(a));
    assert.equal(9, population.length);
  });

  it('make a plan with views', async () => {
    var a = new Arc({id: "test-plan-arc", loader});
    var personView = a.createView(Person.type.viewOf(), "aperson");
    var productView = a.createView(Product.type.viewOf(), "products");

    var p = new Planner();
    var population = await(p.plan(a));
    assert.equal(12, population.length);
  });
});

describe('ConvertConstraintsToConnections', async() => {

  it('fills out an empty constraint', async() => {
    var recipe = new Recipe();
    recipe.newConnectionConstraint('A', 'b', 'C', 'd');
    var strategizer = {generated: [{result: recipe, score: 1}]};
    var cctc = new ConvertConstraintsToConnections();
    let { results } = await cctc.generate(strategizer);
    assert(results.length == 1);
    let { result, score } = results[0];
    assert.deepEqual(result.toString(),
`recipe
  map as view0
  A as particle0
    b = view0
  C as particle1
    d = view0`);
  });
});
