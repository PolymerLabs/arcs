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
let GroupViewConnections = require('../strategies/group-view-connections.js');
let CombinedStrategy = require('../strategies/combined-strategy.js');
let FallbackFate = require('../strategies/fallback-fate.js');

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
    assert.equal(planner.strategizer.population.length, 5);
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
    assert.equal(planner.strategizer.population.length, 5);
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
  create as view0
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
  create as view0
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
  create as view0
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
  create as view0
  A as particle0
    b = view0
  C as particle1
    d = view0`);
  });

  it('fills out a constraint, reusing two particles and a view', async() => {
    let recipe = (await Manifest.parse(`
      schema S
      particle A
        A(inout S b)
      particle C
        C(inout S d)

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
  use as view0 # S
  A as particle0
    b = view0
  C as particle1
    d = view0`);
  });

  it('fills out a constraint, reusing two particles and a view (2)', async() => {
    let recipe = (await Manifest.parse(`
      schema S
      particle A
        A(inout S b)
      particle C
        C(inout S d)

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
  use as view0 # S
  A as particle0
    b = view0
  C as particle1
    d = view0`);
  });

  it('removes an already fulfilled constraint', async() => {
    let recipe = (await Manifest.parse(`
      schema S
      particle A
        A(inout S b)
      particle C
        C(inout S d)

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
  use as view0 # S
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
    let particlesSpec = `
    particle A in 'A.js'
      A()
      consume root

    particle B in 'B.js'
      B()
      consume root
    `;
    let testManifest = async (recipeManifest) => {
      let manifest = (await Manifest.parse(`
        ${particlesSpec}

        ${recipeManifest}
      `));
      var strategizer = {generated: [{result: manifest.recipes[0], score: 1}]};
      var arc = createTestArc("test-plan-arc", manifest, "dom");
      var mrs = new MapRemoteSlots(arc);

      let { results } = await mrs.generate(strategizer);
      assert.equal(results.length, 1);
      assert.isTrue(results[0].result.isResolved());
      assert.equal(results[0].result.slots.length, 1);
    };
    await testManifest(`
      recipe
        A as particle0
        B as particle1
    `);
    await testManifest(`
      recipe
        A as particle0
          consume root
        B as particle1
    `);
    await testManifest(`
      recipe
        A as particle0
        B as particle1
          consume root
    `);
    await testManifest(`
      recipe
        A as particle0
          consume root
        B as particle1
          consume root
    `);
  });
});

describe('AssignOrCopyRemoteViews', function() {
  it ('finds tagged remote views', async() => {
    let particlesSpec = `
    schema Foo

    particle A in 'A.js'
      A(in [Foo] list)
      consume root

    particle B in 'A.js'
      B(inout [Foo] list)
      consume root
    `;
    let testManifest = async (recipeManifest, expectedResults) => {
      let manifest = (await Manifest.parse(`
        ${particlesSpec}

        ${recipeManifest}
      `));

      let schema = manifest.findSchemaByName('Foo');
      manifest.newView(schema.type.viewOf(), 'Test1', 'test-1', ['#tag1']);
      manifest.newView(schema.type.viewOf(), 'Test2', 'test-2', ['#tag2']);
      manifest.newView(schema.type.viewOf(), 'Test2', 'test-3', []);

      var arc = createTestArc("test-plan-arc", manifest, "dom");

      var planner = new Planner();
      planner.init(arc);
      let plans = await planner.plan(1000);

      assert.equal(plans.length, expectedResults, recipeManifest);
    };

    // map one
    await testManifest(`
      recipe
        map #tag1 as list
        A as particle0
          list <- list
    `, 1);
    await testManifest(`
      recipe
        map #tag2 as list
        A as particle0
          list <- list
    `, 1);
    await testManifest(`
      recipe
        map #tag3 as list
        A as particle0
          list <- list
    `, 0);
    await testManifest(`
      recipe
        map as list
        A as particle0
          list <- list
    `, 3);

    // copy one
    await testManifest(`
      recipe
        copy #tag1 as list
        A as particle0
          list <- list
    `, 1);
    await testManifest(`
      recipe
        copy #tag2 as list
        A as particle0
          list <- list
    `, 1);
    await testManifest(`
      recipe
        copy #tag3 as list
        A as particle0
          list <- list
    `, 0);
    await testManifest(`
      recipe
        copy as list
        A as particle0
          list <- list
    `, 3);

    // both at once
    await testManifest(`
      recipe
        map #tag1 as list
        copy #tag2 as list2
        A as particle0
          list <- list
        B as particle1
          list = list2
    `, 1);
    await testManifest(`
      recipe
        map #tag1 as list
        copy #tag3 as list2
        A as particle0
          list <- list
        B as particle1
          list = list2
    `, 0);

    // both, but only one has a tag
    await testManifest(`
      recipe
        map #tag1 as list
        copy as list2
        A as particle0
          list <- list
        B as particle1
          list = list2
    `, 2);
    await testManifest(`
      recipe
        map as list
        copy #tag2 as list2
        A as particle0
          list <- list
        B as particle1
          list = list2
    `, 2);

    // no tags leads to all possible permutations of 3 matching views
    await testManifest(`
      recipe
        map as list
        copy as list2
        A as particle0
          list <- list
        B as particle1
          list = list2
    `, 6);

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
    let recipe = manifest.recipes[0];
    assert(recipe.normalize());
    assert(!recipe.isResolved());
    var strategizer = {generated: [], terminal: [{result: recipe, score: 1}]};
    var stp = new SearchTokensToParticles(arc);
    let { results } = await stp.generate(strategizer);
    assert.equal(results.length, 2);
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

  describe('GroupViewConnections', function() {
    let schemaAndParticlesStr = `
schema Thing
schema OtherThing
particle A
  A(in Thing ithingA1)
particle B
  B(in Thing ithingB1, in Thing ithingB2, in [OtherThing] iotherthingB1)
particle C
  C(in Thing ithingC1, out Thing othingC2, inout [OtherThing] iootherthingC1)
particle D
  D(in Thing ithingD1, in Thing ithingD2, out Thing othingD3)
    `;
    it ('group in and out view connections', async() => {
      // TODO: add another Type view connections to the recipe!
      let manifest = (await Manifest.parse(`
${schemaAndParticlesStr}
recipe
  A
  B
  C
  D
      `));
      var strategizer = {generated: [{result: manifest.recipes[0], score: 1}]};
      var arc = createTestArc("test-plan-arc", manifest, "dom");
      arc._search = "showproducts and chooser alsoon recommend";
      var gvc = new GroupViewConnections(arc);

      let { results } = await gvc.generate(strategizer);
      assert.equal(results.length, 1);
      let recipe = results[0].result;
      assert.equal(4, recipe.views.length);
      // Verify all connections are bound to views.
      assert.isUndefined(recipe.viewConnections.find(vc => !vc.view));
      // Verify all views have non-empty connections list.
      assert.isUndefined(recipe.views.find(v => v.connections.length == 0));
    });
  });
  describe('CombinedStrategy', function() {
    it ('combined strategy with search tokens and group view connections', async() => {
      let manifest = (await Manifest.parse(`
        schema Energy
        schema Height
        particle Energizer in 'A.js'
          prepare(out Energy energy)
        particle Jumper in 'AA.js'
          jump(in Energy energy, out Height height)

        recipe
          search \`prepare and jump\`
      `));
      manifest.recipes[0].normalize();
      var strategizer = {generated: [{result: manifest.recipes[0], score: 1}], terminal:[]};
      var arc = createTestArc("test-plan-arc", manifest, "dom");
      var cs = new CombinedStrategy([
        new SearchTokensToParticles(arc),
        new GroupViewConnections(arc),
      ]);

      let { results } = await cs.generate(strategizer);
      assert.equal(results.length, 2);
      assert.isTrue(results[0].final);
      assert.isFalse(!!results[1].final);
      // Examine the last recipe - it was produced by applying all strategies.
      let recipe = results[results.length - 1].result;
      assert.equal(2, recipe.particles.length);
      assert.equal(1, recipe.views.length);
      assert.equal(2, recipe.views[0].connections.length);
    });
  });
});
describe('FallbackFate', function() {
  it('fallback for search based recipe', async () => {
    let manifest = (await Manifest.parse(`
      schema Thing
      particle DoSomething in 'AA.js'
        DoSomething(in Thing inthing, out Thing outthing)

      recipe
        search \`DoSomething DoSomethingElse\`
        use as view0
        use as view1
        DoSomething as particle0
          inthing <- view0
          outthing -> view1
    `));
    let recipe = manifest.recipes[0];
    recipe.views.forEach(v => v._originalFate = "?");
    assert(recipe.normalize());
    var arc = createTestArc("test-plan-arc", manifest, "dom");
    var strategizer = {generated: [{result: manifest.recipes[0], score: 1}], terminal: []};
    var strategy = new FallbackFate(arc);

    // no resolved search tokens.
    let { results } = await strategy.generate(strategizer);
    assert.equal(results.length, 0);

    // Resolved a search token and rerun strategy.
    recipe.search.resolveToken('DoSomething');
    results = (await strategy.generate(strategizer)).results;
    assert.equal(results.length, 1);
    let plan = results[0].result;
    assert.equal(plan.views.length, 2);
    assert.equal('map', plan.views[0].fate);
    assert.equal('copy', plan.views[1].fate);
  });

  it('ignore non-search unresolved recipe', async () => {
    // Same as above, but the recipe doesn't originate from user search query.
    let manifest = (await Manifest.parse(`
      schema Thing
      particle DoSomething in 'AA.js'
        DoSomething(in Thing inthing, out Thing outthing)

      recipe
        use as view0
        use as view1
        DoSomething as particle0
          inthing <- view0
          outthing -> view1
    `));
    let recipe = manifest.recipes[0];
    recipe.views.forEach(v => v._originalFate = "?");
    assert(recipe.normalize());
    var arc = createTestArc("test-plan-arc", manifest, "dom");
    var strategizer = {generated: [{result: manifest.recipes[0], score: 1}], terminal: []};

    var strategy = new FallbackFate(arc);
    let { results } = await strategy.generate(strategizer);
    assert.equal(results.length, 0);
  });
});
