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
let InitPopulation = require('../strategies/init-population.js');
let MapRemoteSlots = require('../strategies/map-remote-slots.js');
let MatchParticleByVerb = require('../strategies/match-particle-by-verb.js');
let SearchTokensToParticles = require('../strategies/search-tokens-to-particles.js');

var loader = new Loader();

function createTestArc(id, context, affordance) {
  return new Arc({
    id,
    context,
    slotComposer: {
      affordance,
      getAvailableSlots: (() => { return {root: [{id: 'r0', count: 0, views: [], providedSlotSpec: {isSet: false}}]}; })
    }
  });
}

describe('Planner', function() {

  it('can generate things', async () => {
    let manifest = await Manifest.load('../particles/test/giftlist.manifest', loader);
    var arc = createTestArc("test-plan-arc", manifest, "dom");
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
    var arc = createTestArc("test-plan-arc", manifest, "dom");
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

const InitSearch = require('../strategies/init-search.js');
describe('InitSearch', async () => {
  it('initializes the search recipe', async() => {
    var arc = new Arc({id: 'test-plan-arc', context: {}});
    arc._search = 'search';
    let initSearch = new InitSearch(arc);
    var strategizer = {generated: [], generation: 0};
    let {results} = await initSearch.generate(strategizer);
    assert.equal(results.length, 1);
    assert.equal(results[0].score, 0);
  });
});

describe('InitPopulation', async () => {
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
    assert.equal(results.length, 1);
    assert.deepEqual(results[0].result.particles.map(p => p.name), ['A', 'C']);
  });
});

describe('MapRemoteSlots', function() {
  it ('predefined remote slots', async() => {
    let manifest = (await Manifest.parse(`
      particle A in 'A.js'
        A()
        consume root

      recipe
        slot as rootSlot
        A as particle0
          consume root as rootSlot
    `));
    var strategizer = {generated: [{result: manifest.recipes[0], score: 1}]};
    var arc = createTestArc("test-plan-arc", manifest, "dom");
    var mrs = new MapRemoteSlots(arc);
    let { results } = await mrs.generate(strategizer);
    assert.equal(results.length, 1);
  });
});

describe('SearchTokensToParticles', function() {
  it ('particles by verb strategy', async() => {
    let manifest = (await Manifest.parse(`
      particle SimpleJumper in 'A.js'
        jump()
      particle StarJumper in 'AA.js'
        jump()
      particle GalaxyFlyer in 'AA.js'
        fly()
      particle Rester in 'AA.js'
        rest()

      recipe
        search \`jump or fly or run and Rester\`
    `));
    var arc = createTestArc("test-plan-arc", manifest, "dom");
    var strategizer = {generated: [{result: manifest.recipes[0], score: 1}]};
    var stp = new SearchTokensToParticles(arc);
    let { results } = await stp.generate(strategizer);
    assert.equal(results.length, 2);
    debugger;
    assert.deepEqual([["GalaxyFlyer", "Rester", "SimpleJumper"],
                      ["GalaxyFlyer", "Rester", "StarJumper"]], results.map(r => r.result.particles.map(p => p.name).sort()));
    assert.deepEqual(["fly", "jump", "rester"], results[0].result.search.resolvedTokens);
    assert.deepEqual(["and", "or", "or", "run"], results[0].result.search.unresolvedTokens);
  });
});

describe('MatchParticleByVerb', function() {
  let manifestStr = `
    schema Energy
    schema Height
    particle SimpleJumper in 'A.js'
      jump(in Energy e, out Height h)
      affordance dom
      consume root
    particle StarJumper in 'AA.js'
      jump(in Energy e, inout Height h)
      affordance dom
      consume root
    particle VoiceStarJumper in 'AA.js'  # wrong affordance
      jump(in Energy e, out Height h)
      affordance voice
      consume root
    particle GalaxyJumper in 'AA.js'  # wrong connections
      jump(in Energy e)
      affordance dom
      consume root
    particle StarFlyer in 'AA.js'  # wrong verb
      fly()

    recipe
      use as height
      use as energy
      particle can jump
        * = height
        * <- energy
  `;

  it ('particles by verb strategy', async() => {
    let manifest = (await Manifest.parse(manifestStr));
    var arc = createTestArc("test-plan-arc", manifest, "dom");
    // Apply MatchParticleByVerb strategy.
    var strategizer = {generated: [{result: manifest.recipes[0], score: 1}]};
    var mpv = new MatchParticleByVerb(arc);
    let { results } = await mpv.generate(strategizer);
    assert.equal(results.length, 3);
    // Note: view connections are not resolved yet.
    assert.deepEqual(["GalaxyJumper", "SimpleJumper", "StarJumper"], results.map(r => r.result.particles[0].name).sort());
  });

  it ('particles by verb recipe fully resolved', async() => {
    let manifest = (await Manifest.parse(manifestStr));
    let recipe = manifest.recipes[0];
    recipe.views[0].mapToView({id: 'test1', type: manifest.findSchemaByName('Height').entityClass().type});
    recipe.views[1].mapToView({id: 'test2', type: manifest.findSchemaByName('Energy').entityClass().type});

    var arc = createTestArc("test-plan-arc", manifest, "dom");

    // Apply all strategies to resolve recipe where particles are referenced by verbs.
    var planner = new Planner();
    planner.init(arc);
    let plans = await planner.plan(1000);

    assert.equal(2, plans.length);
    assert.deepEqual([["SimpleJumper"], ["StarJumper"]],
                     plans.map(plan => plan.particles.map(particle => particle.name)));
  });
});
