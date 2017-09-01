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
    let manifest = await Manifest.load('../particles/test/giftlist.manifest', loader);
    var arc = new Arc({
      id: "test-plan-arc",
      context: manifest,
      slotComposer: {
        affordance: 'dom',
        getAvailableSlots: (() => { return {root: [{id: 'r0', count: 0, views: [], providedSlotSpec: {isSet: false}}]}; })
      }
    });
    let Person = manifest.findSchemaByName('Person').entityClass();
    let Product = manifest.findSchemaByName('Person').entityClass();
    var planner = new Planner();
    planner.init(arc);
    await planner.generate(),
    await planner.generate(),
    await planner.generate(),
    assert.equal(planner.strategizer.population.length, 6);
  });

  it('make a plan with views', async () => {
    let manifest = await Manifest.load('../particles/test/giftlist.manifest', loader);
    var arc = new Arc({
      id: "test-plan-arc",
      context: manifest,
      slotComposer: {
        affordance: 'dom',
        getAvailableSlots: (() => { return {root: [{id: 'r0', count: 0, views: [], providedSlotSpec: {isSet: false}}]}; })
      }
    });
    let Person = manifest.findSchemaByName('Person').entityClass();
    let Product = manifest.findSchemaByName('Product').entityClass();
    var personView = arc.createView(Person.type.viewOf(), "aperson");
    var productView = arc.createView(Product.type.viewOf(), "products");
    var planner = new Planner();
    planner.init(arc);
    await planner.generate(),
    await planner.generate(),
    await planner.generate(),
    assert.equal(planner.strategizer.population.length, 6);
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
    var arc = new Arc({id: 'test-plan-arc', context: {recipes: [recipe]}});
    arc.instantiate(recipe);
    let ip = new InitPopulation(arc);

    var strategizer = {generated: [], generation: 0};
    let { results } = await ip.generate(strategizer);
    assert.equal(results.length, 1);
    assert.equal(results[0].score, 0);
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
    var cctc = new ConvertConstraintsToConnections({pec:{}});
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
    var cctc = new ConvertConstraintsToConnections({pec:{}});
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
    var cctc = new ConvertConstraintsToConnections({pec:{}});
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
    var cctc = new ConvertConstraintsToConnections({pec:{}});
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
        use as v1
        C
          d = v1
        A`)).recipes[0];
    var strategizer = {generated: [{result: recipe, score: 1}]};
    var cctc = new ConvertConstraintsToConnections({pec:{}});
    let { results } = await cctc.generate(strategizer);
    assert(results.length == 1);
    let { result, score } = results[0];
    assert.deepEqual(result.toString(),
`recipe
  use as view0
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
        use as v1
        C
        A
          b = v1`)).recipes[0];
    var strategizer = {generated: [{result: recipe, score: 1}]};
    var cctc = new ConvertConstraintsToConnections({pec:{}});
    let { results } = await cctc.generate(strategizer);
    assert(results.length == 1);
    let { result, score } = results[0];
    assert.deepEqual(result.toString(),
`recipe
  use as view0
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
        use as v1
        C
          d = v1
        A
          b = v1`)).recipes[0];
    var strategizer = {generated: [{result: recipe, score: 1}]};
    var cctc = new ConvertConstraintsToConnections({pec:{}});
    let { results } = await cctc.generate(strategizer);
    assert(results.length == 1);
    let { result, score } = results[0];
    assert.deepEqual(result.toString(), `recipe
  use as view0
  A as particle0
    b = view0
  C as particle1
    d = view0`);
  });

  it('verifies affordance', async() => {
    let recipes = (await Manifest.parse(`
      particle A in 'A.js'
        A()
        affordance voice
        consume root
      particle C in 'C.js'
        C()
        affordance voice
        consume root
      particle E in 'E.js'
        E()
        consume root

      recipe
        A.b -> C.d
      recipe
        A.b -> E.f
    `)).recipes;
    var strategizer = {generated: [{result: recipes[0], score: 1}, {result: recipes[1], score: 1}]};
    var cctc = new ConvertConstraintsToConnections({pec: {slotComposer: {affordance: 'voice'}}});
    let { results } = await cctc.generate(strategizer);
    debugger;
    assert.equal(results.length, 1);
    assert.deepEqual(results[0].result.particles.map(p => p.name), ['A', 'C']);
  });
});
