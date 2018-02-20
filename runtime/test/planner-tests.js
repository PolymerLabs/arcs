/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
 'use strict';

import Arc from '../arc.js';
import Loader from '../loader.js';
import Planner from '../planner.js';
import {assert} from './chai-web.js';
import Manifest from '../manifest.js';
import Recipe from '../recipe/recipe.js';
import ConvertConstraintsToConnections from '../strategies/convert-constraints-to-connections.js';
import InitPopulation from '../strategies/init-population.js';
import MapRemoteSlots from '../strategies/map-remote-slots.js';
import MatchParticleByVerb from '../strategies/match-particle-by-verb.js';
import SearchTokensToParticles from '../strategies/search-tokens-to-particles.js';
import GroupHandleConnections from '../strategies/group-handle-connections.js';
import CombinedStrategy from '../strategies/combined-strategy.js';
import CreateDescriptionHandle from '../strategies/create-description-handle.js';
import FallbackFate from '../strategies/fallback-fate.js';
import MessageChannel from '../message-channel.js';
import InnerPec from '../inner-PEC.js';
import Particle from '../particle.js';
let loader = new Loader();

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

async function planFromManifest(manifest, {arcFactory, testSteps}={}) {
  if (typeof manifest == 'string') {
    let fileName = './test.manifest';
    manifest = await Manifest.parse(manifest, {loader, fileName});
  }

  arcFactory = arcFactory || ((manifest) => createTestArc('test', manifest, 'dom'));
  testSteps = testSteps || ((planner) => planner.plan(Infinity));

  let arc = await arcFactory(manifest);
  let planner = new Planner();
  planner.init(arc);
  return await testSteps(planner);
}

const assertRecipeResolved = recipe => {
  assert(recipe.normalize());
  assert.isTrue(recipe.isResolved());
};

const loadTestArcAndRunSpeculation = async (manifest, manifestLoadedCallback) => {
  const registry = {};
  const loader = new class extends Loader {
    loadResource(path) {
      return {manifest}[path];
    }
    async requireParticle(fileName) {
      let clazz = class {
        constructor() {
          this.relevances = [1];
        }
        async setViews(views) {
          let thingView = views.get('thing');
          thingView.set(new thingView.entityClass({name: 'MYTHING'}));
        }
      };
      return clazz;
    }
    path(fileName) {
      return fileName;
    }
    join(_, file) {
      return file;
    }
  };
  const loadedManifest = await Manifest.load('manifest', loader, {registry});
  manifestLoadedCallback(loadedManifest);

  const pecFactory = function(id) {
    const channel = new MessageChannel();
    new InnerPec(channel.port1, `${id}:inner`, loader);
    return channel.port2;
  };
  const arc = new Arc({id: 'test-plan-arc', context: loadedManifest, pecFactory, loader});
  const planner = new Planner();
  planner.init(arc);

  const plans = await planner.suggest();
  return {plans, arc};
};

describe('Planner', function() {
  it('can generate things', async () => {
    let manifest = await Manifest.load('./runtime/test/artifacts/giftlist.manifest', loader);
    let testSteps = async planner => {
      await planner.generate();
      await planner.generate();
      await planner.generate();
      return planner.strategizer.population.length;
    };
    let results = await planFromManifest(manifest, {testSteps});
    assert.equal(results, 5);
  });

  // TODO: rewrite or remove this, it doesn't test anything more than the above test?
  it('can make a plan with views', async () => {
    let manifest = await Manifest.load('./runtime/test/artifacts/giftlist.manifest', loader);
    let arcFactory = async manifest => {
      let arc = createTestArc('test-plan-arc', manifest, 'dom');
      let Person = manifest.findSchemaByName('Person').entityClass();
      let Product = manifest.findSchemaByName('Product').entityClass();
      let personView = await arc.createHandle(Person.type.setViewOf(), 'aperson');
      let productView = await arc.createHandle(Product.type.setViewOf(), 'products');
      return arc;
    };
    let testSteps = async planner => {
      await planner.generate();
      await planner.generate();
      await planner.generate();
      return planner.strategizer.population.length;
    };
    let results = await planFromManifest(manifest, {arcFactory, testSteps});
    assert.equal(results, 5);
  });

  it('can map remote views structurally', async () => {
    let results = await planFromManifest(`
      view AView of * {Text text, Text moreText} in './shell/artifacts/Things/empty.json'
      particle P1 in './some-particle.js'
        P1(in * {Text text} text)
      recipe
        map as view
        P1
          text <- view
    `);
    assert.equal(results.length, 1);
  });

  it('can copy remote views structurally', async () => {
    let results = await planFromManifest(`
      view AView of * {Text text, Text moreText} in './shell/artifacts/Things/empty.json'
      particle P1 in './some-particle.js'
        P1(in * {Text text} text)
      recipe
        copy as view
        P1
          text <- view
    `);
    assert.equal(results.length, 1);
  });

  it('can resolve multiple consumed slots', async () => {
    let results = await planFromManifest(`
      particle P1 in './some-particle.js'
        P1()
        consume one
        consume two
      recipe
        slot 'slot-id0' as s0
        P1
          consume one as s0
    `);
    assert.equal(results.length, 1);
  });

  it('can speculate in parallel', async () => {
    const manifest = `
          schema Thing
            optional
              Text name

          particle A in 'A.js'
            A(out Thing thing)
            consume root
            description \`Make \${thing}\`

          recipe
            create as v1
            slot 'root-slot' as slot0
            A
              thing -> v1
              consume root as slot0

          recipe
            create as v2
            slot 'root-slot2' as slot1
            A
              thing -> v2
              consume root as slot1
          `;
    const {plans} = await loadTestArcAndRunSpeculation(manifest,
      manifest => {
        assertRecipeResolved(manifest.recipes[0]);
        assertRecipeResolved(manifest.recipes[1]);
      }
    );
    assert.equal(plans.length, 2);
    // Make sure the recipes were processed as separate plan groups.
    // TODO(wkorman): When we move to a thread pool we'll revise this to check
    // the thread index instead.
    assert.equal(plans[0].groupIndex, 0);
    assert.equal(plans[1].groupIndex, 1);
  });
});

import InitSearch from '../strategies/init-search.js';
describe('InitSearch', async () => {
  it('initializes the search recipe', async () => {
    let arc = new Arc({id: 'test-plan-arc', context: {}});
    arc._search = 'search';
    let initSearch = new InitSearch(arc);
    let strategizer = {generated: [], generation: 0};
    let {results} = await initSearch.generate(strategizer);
    assert.equal(results.length, 1);
    assert.equal(results[0].score, 0);
  });
});

describe('InitPopulation', async () => {
  it('penalizes resolution of particles that already exist in the arc', async () => {
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
    let arc = new Arc({id: 'test-plan-arc', context: {recipes: [recipe]}});
    await arc.instantiate(recipe);
    let ip = new InitPopulation(arc);

    let strategizer = {generated: [], generation: 0};
    let {results} = await ip.generate(strategizer);
    assert.equal(results.length, 1);
    assert.equal(results[0].score, 0);
  });
});

describe('ConvertConstraintsToConnections', async () => {

  it('fills out an empty constraint', async () => {
    let recipe = (await Manifest.parse(`
      schema S
      particle A
        A(inout S b)
      particle C
        C(inout S d)

      recipe
        A.b -> C.d`)).recipes[0];
    let strategizer = {generated: [{result: recipe, score: 1}]};
    let cctc = new ConvertConstraintsToConnections({pec: {}});
    let {results} = await cctc.generate(strategizer);
    assert(results.length == 1);
    let {result, score} = results[0];
    assert.deepEqual(result.toString(),
`recipe
  create as view0 // S
  A as particle0
    b = view0
  C as particle1
    d = view0`);
  });

  it('fills out a constraint, reusing a single particle', async () => {
    let recipe = (await Manifest.parse(`
      schema S
      particle A
        A(inout S b)
      particle C
        C(inout S d)

      recipe
        A.b -> C.d
        C`)).recipes[0];
    let strategizer = {generated: [{result: recipe, score: 1}]};
    let cctc = new ConvertConstraintsToConnections({pec: {}});
    let {results} = await cctc.generate(strategizer);
    assert(results.length == 1);
    let {result, score} = results[0];
    assert.deepEqual(result.toString(),
`recipe
  create as view0 // S
  A as particle0
    b = view0
  C as particle1
    d = view0`);
  });

  it('fills out a constraint, reusing a single particle (2)', async () => {
    let recipe = (await Manifest.parse(`
      schema S
      particle A
        A(inout S b)
      particle C
        C(inout S d)

      recipe
        A.b -> C.d
        A`)).recipes[0];
    let strategizer = {generated: [{result: recipe, score: 1}]};
    let cctc = new ConvertConstraintsToConnections({pec: {}});
    let {results} = await cctc.generate(strategizer);
    assert(results.length == 1);
    let {result, score} = results[0];
    assert.deepEqual(result.toString(),
`recipe
  create as view0 // S
  A as particle0
    b = view0
  C as particle1
    d = view0`);
  });


  it('fills out a constraint, reusing two particles', async () => {
    let recipe = (await Manifest.parse(`
      schema S
      particle A
        A(inout S b)
      particle C
        C(inout S d)

      recipe
        A.b -> C.d
        C
        A`)).recipes[0];
    let strategizer = {generated: [{result: recipe, score: 1}]};
    let cctc = new ConvertConstraintsToConnections({pec: {}});
    let {results} = await cctc.generate(strategizer);
    assert(results.length == 1);
    let {result, score} = results[0];
    assert.deepEqual(result.toString(),
`recipe
  create as view0 // S
  A as particle0
    b = view0
  C as particle1
    d = view0`);
  });

  it('fills out a constraint, reusing two particles and a view', async () => {
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
    let strategizer = {generated: [{result: recipe, score: 1}]};
    let cctc = new ConvertConstraintsToConnections({pec: {}});
    let {results} = await cctc.generate(strategizer);
    assert(results.length == 1);
    let {result, score} = results[0];
    assert.deepEqual(result.toString(),
`recipe
  use as view0 // S
  A as particle0
    b = view0
  C as particle1
    d = view0`);
  });

  it('fills out a constraint, reusing two particles and a view (2)', async () => {
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
    let strategizer = {generated: [{result: recipe, score: 1}]};
    let cctc = new ConvertConstraintsToConnections({pec: {}});
    let {results} = await cctc.generate(strategizer);
    assert(results.length == 1);
    let {result, score} = results[0];
    assert.deepEqual(result.toString(),
`recipe
  use as view0 // S
  A as particle0
    b = view0
  C as particle1
    d = view0`);
  });

  it('removes an already fulfilled constraint', async () => {
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
    let strategizer = {generated: [{result: recipe, score: 1}]};
    let cctc = new ConvertConstraintsToConnections({pec: {}});
    let {results} = await cctc.generate(strategizer);
    assert(results.length == 1);
    let {result, score} = results[0];
    assert.deepEqual(result.toString(), `recipe
  use as view0 // S
  A as particle0
    b = view0
  C as particle1
    d = view0`);
  });

  it('verifies affordance', async () => {
    let recipes = (await Manifest.parse(`
      schema S
      particle A in 'A.js'
        A(in S b)
        affordance voice
        consume root
      particle C in 'C.js'
        C(in S d)
        affordance voice
        consume root
      particle E in 'E.js'
        E(in S f)
        consume root

      recipe
        A.b -> C.d
      recipe
        A.b -> E.f
    `)).recipes;
    let strategizer = {generated: [{result: recipes[0], score: 1}, {result: recipes[1], score: 1}]};
    let cctc = new ConvertConstraintsToConnections({pec: {slotComposer: {affordance: 'voice'}}});
    let {results} = await cctc.generate(strategizer);
    assert.equal(results.length, 1);
    assert.deepEqual(results[0].result.particles.map(p => p.name), ['A', 'C']);
  });
});

describe('MapRemoteSlots', function() {
  it('predefined remote slots', async () => {
    let particlesSpec = `
    particle A in 'A.js'
      A()
      consume root

    particle B in 'B.js'
      B()
      consume root
    `;
    let testManifest = async (recipeManifest, expectedSlots) => {
      let manifest = (await Manifest.parse(`
        ${particlesSpec}

        ${recipeManifest}
      `));
      let strategizer = {generated: [{result: manifest.recipes[0], score: 1}]};
      let arc = createTestArc('test-plan-arc', manifest, 'dom');
      let mrs = new MapRemoteSlots(arc);

      let {results} = await mrs.generate(strategizer);
      assert.equal(results.length, 1);
      assert.isTrue(results[0].result.isResolved());
      assert.equal(results[0].result.slots.length, expectedSlots);
    };
    await testManifest(`
      recipe
        A as particle0
        B as particle1
    `, /* expectedSlots= */ 1);
    await testManifest(`
      recipe
        A as particle0
          consume root
        B as particle1
    `, /* expectedSlots= */ 1);
    await testManifest(`
      recipe
        A as particle0
        B as particle1
          consume root
    `, /* expectedSlots= */ 1);
    await testManifest(`
      recipe
        A as particle0
          consume root as slot0
        B as particle1
          consume root as slot0
    `, /* expectedSlots= */ 1);
    await testManifest(`
      recipe
        A as particle0
          consume root
        B as particle1
          consume root
    `, /* expectedSlots= */ 2);
  });
});

describe('AssignOrCopyRemoteViews', function() {
  it('finds tagged remote views', async () => {
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
      manifest.newHandle(schema.type.setViewOf(), 'Test1', 'test-1', ['#tag1']);
      manifest.newHandle(schema.type.setViewOf(), 'Test2', 'test-2', ['#tag2']);
      manifest.newHandle(schema.type.setViewOf(), 'Test2', 'test-3', []);

      let arc = createTestArc('test-plan-arc', manifest, 'dom');

      let planner = new Planner();
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
  it('particles by verb strategy', async () => {
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
    let arc = createTestArc('test-plan-arc', manifest, 'dom');
    let recipe = manifest.recipes[0];
    assert(recipe.normalize());
    assert(!recipe.isResolved());
    let strategizer = {generated: [], terminal: [{result: recipe, score: 1}]};
    let stp = new SearchTokensToParticles(arc);
    let {results} = await stp.generate(strategizer);
    assert.equal(results.length, 2);
    assert.deepEqual([['GalaxyFlyer', 'Rester', 'SimpleJumper'],
                      ['GalaxyFlyer', 'Rester', 'StarJumper']], results.map(r => r.result.particles.map(p => p.name).sort()));
    assert.deepEqual(['fly', 'jump', 'rester'], results[0].result.search.resolvedTokens);
    assert.deepEqual(['and', 'or', 'or', 'run'], results[0].result.search.unresolvedTokens);
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
    particle VoiceStarJumper in 'AA.js'  // wrong affordance
      jump(in Energy e, out Height h)
      affordance voice
      consume root
    particle GalaxyJumper in 'AA.js'  // wrong connections
      jump(in Energy e)
      affordance dom
      consume root
    particle StarFlyer in 'AA.js'  // wrong verb
      fly()

    recipe
      use as height
      use as energy
      particle can jump
        * = height
        * <- energy
  `;

  it('particles by verb strategy', async () => {
    let manifest = (await Manifest.parse(manifestStr));
    let arc = createTestArc('test-plan-arc', manifest, 'dom');
    // Apply MatchParticleByVerb strategy.
    let strategizer = {generated: [{result: manifest.recipes[0], score: 1}]};
    let mpv = new MatchParticleByVerb(arc);
    let {results} = await mpv.generate(strategizer);
    assert.equal(results.length, 3);
    // Note: view connections are not resolved yet.
    assert.deepEqual(['GalaxyJumper', 'SimpleJumper', 'StarJumper'], results.map(r => r.result.particles[0].name).sort());
  });

  it('particles by verb recipe fully resolved', async () => {
    let manifest = (await Manifest.parse(manifestStr));
    let recipe = manifest.recipes[0];
    recipe.views[0].mapToView({id: 'test1', type: manifest.findSchemaByName('Height').entityClass().type});
    recipe.views[1].mapToView({id: 'test2', type: manifest.findSchemaByName('Energy').entityClass().type});

    let arc = createTestArc('test-plan-arc', manifest, 'dom');

    // Apply all strategies to resolve recipe where particles are referenced by verbs.
    let planner = new Planner();
    planner.init(arc);
    let plans = await planner.plan(1000);

    assert.equal(2, plans.length);
    assert.deepEqual([['SimpleJumper'], ['StarJumper']],
                     plans.map(plan => plan.particles.map(particle => particle.name)));
  });

  describe('GroupHandleConnections', function() {
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
    it('group in and out view connections', async () => {
      // TODO: add another Type view connections to the recipe!
      let manifest = (await Manifest.parse(`
${schemaAndParticlesStr}
recipe
  A
  B
  C
  D
      `));
      let strategizer = {generated: [{result: manifest.recipes[0], score: 1}]};
      let arc = createTestArc('test-plan-arc', manifest, 'dom');
      arc._search = 'ShowItems and chooser alsoon recommend';
      let ghc = new GroupHandleConnections(arc);

      let {results} = await ghc.generate(strategizer);
      assert.equal(results.length, 1);
      let recipe = results[0].result;
      assert.equal(4, recipe.views.length);
      // Verify all connections are bound to handles.
      assert.isUndefined(recipe.handleConnections.find(hc => !hc.view));
      // Verify all views have non-empty connections list.
      assert.isUndefined(recipe.views.find(v => v.connections.length == 0));
    });
  });
  describe('CombinedStrategy', function() {
    it('combined strategy with search tokens and group view connections', async () => {
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
      let strategizer = {generated: [{result: manifest.recipes[0], score: 1}], terminal: []};
      let arc = createTestArc('test-plan-arc', manifest, 'dom');
      let strategy = new CombinedStrategy([
        new SearchTokensToParticles(arc),
        new GroupHandleConnections(arc),
      ]);

      let {results} = await strategy.generate(strategizer);
      assert.equal(results.length, 1);
      let recipe = results[0].result;
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
    recipe.views.forEach(v => v._originalFate = '?');
    assert(recipe.normalize());
    let arc = createTestArc('test-plan-arc', manifest, 'dom');
    let strategizer = {generated: [{result: manifest.recipes[0], score: 1}], terminal: []};
    let strategy = new FallbackFate(arc);

    // no resolved search tokens.
    let {results} = await strategy.generate(strategizer);
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
    recipe.views.forEach(v => v._originalFate = '?');
    assert(recipe.normalize());
    let arc = createTestArc('test-plan-arc', manifest, 'dom');
    let strategizer = {generated: [{result: manifest.recipes[0], score: 1}], terminal: []};

    let strategy = new FallbackFate(arc);
    let {results} = await strategy.generate(strategizer);
    assert.equal(results.length, 0);
  });
});

describe('Type variable resolution', function() {
  let loadAndPlan = async (manifestStr) => {
    let loader = {
      join: (() => { return ''; }),
      loadResource: (() => { return '[]'; })
    };
    let manifest = (await Manifest.parse(manifestStr, {loader}));

    let arc = createTestArc('test-plan-arc', manifest, 'dom');
    let planner = new Planner();
    planner.init(arc);
    return planner.plan(1000);
  };
  let verifyResolvedPlan = async (manifestStr) => {
    let plans = await loadAndPlan(manifestStr);
    assert.equal(1, plans.length);

    let recipe = plans[0];
    recipe.normalize();
    assert.isTrue(recipe.isResolved());
  };

  let verifyUnresolvedPlan = async (manifestStr) => {
    let plans = await loadAndPlan(manifestStr);
    assert.equal(0, plans.length);
  };
  it('unresolved type variables', async () => {
    // [~a] doesn't resolve to Thing.
    await verifyUnresolvedPlan(`
      schema Thing
      particle P
        P(in ~a thing)
      recipe
        map #mythings as mythings
        P
          thing <- mythings
      view MyThings of [Thing] #mythings in 'things.json'`);

    // ~a doesn't resolve to [Thing]
    await verifyUnresolvedPlan(`
      schema Thing
      particle P
        P(in [~a] things)
      recipe
        map #mything as mything
        P
          things <- mything
      view MyThing of Thing #mything in 'thing.json'`);

    // Different handles using the same type variable don't resolve to different type storages.
    await verifyUnresolvedPlan(`
      schema Thing1
      schema Thing2
      particle P
        P(in [~a] manyThings, out ~a oneThing)
      recipe
        map #manything as manythings
        map #onething as onething
        P
          manyThings <- manythings
          oneThing -> onething
      view ManyThings of [Thing1] #manythings in 'things.json'
      view OneThing of Thing2 #onething in 'thing.json'`);
  });

  it('simple particles type variable resolution', async () => {
    await verifyResolvedPlan(`
      schema Thing1
      particle P1
        P1(in [Thing1] things)
      particle P2
        P2(in [~a] things)
      recipe
        map #mythings as mythings
        P1
          things <- mythings
        P2
          things <- mythings
      view MyThings of [Thing1] #mythings in 'things.json'`);

    await verifyResolvedPlan(`
      schema Thing1
      schema Thing2
      particle P2
        P2(in [~a] things)
      recipe
        map #mythings1 as mythings1
        map #mythings2 as mythings2
        P2
          things <- mythings1
        P2
          things <- mythings2
      view MyThings1 of [Thing1] #mythings1 in 'things1.json'
      view MyThings2 of [Thing2] #mythings2 in 'things2.json'`);

    await verifyResolvedPlan(`
      schema Thing1
      schema Thing2
      particle P2
        P2(in [~a] things, in [Thing2] things2)
      recipe
        map #mythings1 as mythings1
        map #mythings2 as mythings2
        P2
          things <- mythings1
          things2 <- mythings2
      view MyThings1 of [Thing1] #mythings1 in 'things1.json'
      view MyThings2 of [Thing2] #mythings2 in 'things2.json'`);

    await verifyResolvedPlan(`
      schema Thing
      particle P1
        P1(in [~a] things1)
      particle P2
        P2(in [~b] things2)
      recipe
        map #mythings as mythings
        P1
          things1 <- mythings
        P2
          things2 <- mythings
      view MyThings of [Thing] #mythings in 'things.json'`);
  });

  it('transformation particles type variable resolution', async () => {
    let particleSpecs = `
shape HostedShape
  HostedShape(in ~a)
particle P1
  P1(in ~a input)
particle Muxer in 'Muxer.js'
  Muxer(host HostedShape hostedParticle, in [~a] list)`;

    // One transformation particle
    await verifyResolvedPlan(`
${particleSpecs}
recipe
  map #mythings as mythings
  Muxer
    hostedParticle = P1
    list <- mythings
schema Thing1
view MyThings of [Thing1] #mythings in 'things.json'`);

    // Two transformation particles hosting the same particle with same type storage.
    await verifyResolvedPlan(`
${particleSpecs}
recipe
  map #mythings1 as mythings1
  map #mythings2 as mythings2
  Muxer
    hostedParticle = P1
    list <- mythings1
  Muxer
    hostedParticle = P1
    list <- mythings2
schema Thing1
view MyThings1 of [Thing1] #mythings1 in 'things.json'
view MyThings2 of [Thing1] #mythings2 in 'things.json'`);

    // Two transformation particle hosting the same particle with different type storage.
    await verifyResolvedPlan(`
${particleSpecs}
particle P2
  P2(in [~a] inthings)
recipe
  map #mythings1 as mythings1
  map #mythings2 as mythings2
  Muxer
    hostedParticle = P1
    list <- mythings1
  Muxer
    hostedParticle = P1
    list <- mythings2
schema Thing1
view MyThings1 of [Thing1] #mythings1 in 'things.json'
schema Thing2
view MyThings2 of [Thing2] #mythings2 in 'things.json'`);
  });
});

describe('CreateDescriptionHandle', function() {
  it('descriptions handle created', async () => {
    let manifest = (await Manifest.parse(`
      schema Description
      particle DoSomething in 'AA.js'
        DoSomething(out [Description] descriptions)

      recipe
        DoSomething as particle0
    `));
    let recipe = manifest.recipes[0];
    let strategizer = {generated: [{result: manifest.recipes[0], score: 1}], terminal: []};
    let strategy = new CreateDescriptionHandle();
    let results = (await strategy.generate(strategizer)).results;

    assert.equal(results.length, 1);
    let plan = results[0].result;
    assert.equal(plan.views.length, 1);
    assert.equal('create', plan.views[0].fate);
    assert.isTrue(plan.isResolved());
  });
});

describe('Description', async () => {
  it('description generated from speculative execution arc', async () => {
    const manifest = `
    schema Thing
      optional
        Text name

    particle A in 'A.js'
      A(out Thing thing)
      consume root
      description \`Make \${thing}\`

    recipe
      create as v1
      slot 'root-slot' as slot0
      A
        thing -> v1
        consume root as slot0
    `;
    const {plans, arc} = await loadTestArcAndRunSpeculation(manifest,
      manifest => {
        assertRecipeResolved(manifest.recipes[0]);
      }
    );
    assert.equal(plans.length, 1);
    assert.equal('Make MYTHING.', await plans[0].description.getRecipeSuggestion());
    assert.equal(0, arc._handlesById.size);
  });
});
