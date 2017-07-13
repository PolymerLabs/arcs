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
let Manifest = require('../manifest.js');
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
    assert.equal(7, population.length);
  });

  it('make a plan with views', async () => {
    var a = new Arc({id: "test-plan-arc", loader});
    var personView = a.createView(Person.type.viewOf(), "aperson");
    var productView = a.createView(Product.type.viewOf(), "products");

    var p = new Planner();
    var population = await(p.plan(a));
    assert.equal(10, population.length);
  });
});

describe('ConvertConstraintsToConnections', async() => {

  it('fills out an empty constraint', async() => {
    let recipe = (await Manifest.parse(`
      recipe
        A.b -> C.d`)).recipes[0];
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

  it('fills out a constraint, reusing a single particle', async() => {
    let recipe = (await Manifest.parse(`
      recipe
        A.b -> C.d
        C`)).recipes[0];
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

  it('fills out a constraint, reusing a single particle (2)', async() => {
    let recipe = (await Manifest.parse(`
      recipe
        A.b -> C.d
        A`)).recipes[0];
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


  it('fills out a constraint, reusing two particles', async() => {
    let recipe = (await Manifest.parse(`
      recipe
        A.b -> C.d
        C
        A`)).recipes[0];
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

  it('fills out a constraint, reusing two particles and a view', async() => {
    let recipe = (await Manifest.parse(`
      recipe
        A.b -> C.d
        map as v1
        C
          d = v1
        A`)).recipes[0];
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

  it('removes an already fulfilled constraint', async() => {
    let recipe = (await Manifest.parse(`
      recipe
        A.b -> C.d
        map as v1
        C
          d = v1
        A
          b = v1`)).recipes[0];
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
