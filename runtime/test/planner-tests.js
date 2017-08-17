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
let Recipe = require('../recipe/recipe.js');
let ConvertConstraintsToConnections = require('../strategies/convert-constraints-to-connections.js');
let ResolveParticleByName = require('../strategies/resolve-particle-by-name.js');
let InitPopulation = require('../strategies/init-population.js');

var loader = new Loader();

describe('Planner', function() {

  it('can generate things', async () => {
    var arc = new Arc({id: "test-plan-arc", slotComposer : { getAvailableSlots: (() => { return {root: {id: 'r0', count: 0}}; }) }});
    let manifest = await Manifest.load('../particles/test/giftlist.manifest', loader);
    let Person = manifest.findSchemaByName('Person').entityClass();
    let Product = manifest.findSchemaByName('Person').entityClass();
    var planner = new Planner();
    planner.init(arc, {
      recipes: manifest.recipes,
      particleFinder: manifest,
      arc
    });
    await planner.generate(),
    await planner.generate(),
    await planner.generate(),
    assert.equal(planner.strategizer.population.length, 9);
  });

  it('make a plan with views', async () => {
    var arc = new Arc({id: "test-plan-arc", slotComposer : { getAvailableSlots: (() => { return {root: {id: 'r0', count: 0}}; }) }});
    let manifest = await Manifest.load('../particles/test/giftlist.manifest', loader);
    let Person = manifest.findSchemaByName('Person').entityClass();
    let Product = manifest.findSchemaByName('Product').entityClass();
    var personView = arc.createView(Person.type.viewOf(), "aperson");
    var productView = arc.createView(Product.type.viewOf(), "products");
    var planner = new Planner();
    planner.init(arc, {
      recipes: manifest.recipes,
      arc
    });
    await planner.generate(),
    await planner.generate(),
    await planner.generate(),
    assert.equal(planner.strategizer.population.length, 21);
  });
});

describe('InitPopulation', async() => {
  it('penalizes resolution of particles that already exist in the arc', async() => {
    let manifest = await Manifest.parse(`
      schema Product

      particle A in 'A.js'
        A(in Product product)

      recipe
        create as v1
        A
          product <- v1`);
    let recipe = manifest.recipes[0];
    assert(recipe.normalize());
    var arc = new Arc({id: 'test-plan-arc'});
    arc.instantiate(recipe);
    var context = { arc, recipes: [recipe]};
    let ip = new InitPopulation(context);

    var strategizer = {generated: [], generation: 0};
    let { results } = await ip.generate(strategizer);
    assert(results.length == 1);
    assert(results[0].score == 0);
  });
});

describe('ConvertConstraintsToConnections', async() => {

  it('fills out an empty constraint', async() => {
    let recipe = (await Manifest.parse(`
      particle A
      particle C

      recipe
        A.b -> C.d`)).recipes[0];
    var strategizer = {generated: [{result: recipe, score: 1}]};
    var cctc = new ConvertConstraintsToConnections();
    let { results } = await cctc.generate(strategizer);
    assert(results.length == 1);
    let { result, score } = results[0];
    assert.deepEqual(result.toString(),
`recipe
  ? as view0
  A as particle0
    b = view0
  C as particle1
    d = view0`);
  });

  it('fills out a constraint, reusing a single particle', async() => {
    let recipe = (await Manifest.parse(`
      particle A
      particle C

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
  ? as view0
  A as particle0
    b = view0
  C as particle1
    d = view0`);
  });

  it('fills out a constraint, reusing a single particle (2)', async() => {
    let recipe = (await Manifest.parse(`
      particle A
      particle C

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
  ? as view0
  A as particle0
    b = view0
  C as particle1
    d = view0`);
  });


  it('fills out a constraint, reusing two particles', async() => {
    let recipe = (await Manifest.parse(`
      particle A
      particle C

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
  ? as view0
  A as particle0
    b = view0
  C as particle1
    d = view0`);
  });

  it('fills out a constraint, reusing two particles and a view', async() => {
    let recipe = (await Manifest.parse(`
      particle A
      particle C

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

  it('fills out a constraint, reusing two particles and a view (2)', async() => {
    let recipe = (await Manifest.parse(`
      particle A
      particle C

      recipe
        A.b -> C.d
        map as v1
        C
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

  it('removes an already fulfilled constraint', async() => {
    let recipe = (await Manifest.parse(`
      particle A
      particle C

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
    assert.deepEqual(`recipe
  map as view0
  A as particle0
    b = view0
  C as particle1
    d = view0`,
result.toString());
  });
});
