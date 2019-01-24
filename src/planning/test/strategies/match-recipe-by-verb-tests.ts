/**
 * @license
 * Copyright (c) 2018 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {assert} from '../../../platform/chai-web.js';
import {Manifest} from '../../../runtime/manifest.js';
import {ConvertConstraintsToConnections} from '../../strategies/convert-constraints-to-connections.js';
import {MatchRecipeByVerb} from '../../strategies/match-recipe-by-verb.js';

import {StrategyTestHelper} from './strategy-test-helper.js';

describe('MatchRecipeByVerb', () => {
  it('removes a particle and adds a recipe', async () => {
    const manifest = await Manifest.parse(`
      recipe
        &jump

      schema Feet
      schema Energy

      particle JumpingBoots in 'A.js'
        in Feet f
        in Energy e
      particle FootFactory in 'B.js'
        out Feet f
      particle NuclearReactor in 'C.js'
        out Energy e

      recipe &jump
        JumpingBoots.f <- FootFactory.f
        JumpingBoots.e <- NuclearReactor.e
    `);

    const arc = StrategyTestHelper.createTestArc(manifest);
    const inputParams = {generated: [{result: manifest.recipes[0], score: 1}]};
    const mrv = new MatchRecipeByVerb(arc);
    const results = await mrv.generate(inputParams);
    assert.lengthOf(results, 1);
    assert.isEmpty(results[0].result.particles);
    assert.deepEqual(results[0].result.toString(), 'recipe &jump\n  JumpingBoots.e <- NuclearReactor.e\n  JumpingBoots.f <- FootFactory.f');
  });
  it('plays nicely with constraints', async () => {
    const manifest = await Manifest.parse(`
      schema S
      particle P in 'A.js'
        out S p
      particle Q in 'B.js'
        in S q

      recipe
        P.p -> Q.q
        &a

      recipe &a
        P
    `);

    const arc = StrategyTestHelper.createTestArc(manifest);
    const inputParams = {generated: [{result: manifest.recipes[0], score: 1}]};
    const mrv = new MatchRecipeByVerb(arc);
    let results = await mrv.generate(inputParams);
    assert.lengthOf(results, 1);
    const cctc = new ConvertConstraintsToConnections(arc);
    results = await cctc.generate({generated: results});
    assert.lengthOf(results, 1);
    assert.deepEqual(results[0].result.toString(),
`recipe &a
  create as handle0 // S {}
  P as particle0
    p -> handle0
  Q as particle1
    q <- handle0`);
  });

  const basicHandlesContraintsManifest = `
      particle P in 'A.js'
        out S {} a

      particle Q in 'B.js'
        in S {} a
        out S {} b

      particle R in 'C.js'
        in S {} c

      recipe &verb
        P

      recipe &verb
        P
        Q

      recipe &verb
        Q

      recipe &verb
        R`;
  const generatePlans = async (recipesManifest) => {
    const manifest = await Manifest.parse(`
${basicHandlesContraintsManifest}
${recipesManifest}`);
    const arc = StrategyTestHelper.createTestArc(manifest);
    const inputParams = {generated: [{result: manifest.recipes[manifest.recipes.length-1], score: 1}]};
    const mrv = new MatchRecipeByVerb(arc);
    return await mrv.generate(inputParams);
  };

  it('listens to handle constraints - all recipes', async () => {
    const results = await generatePlans(`
      recipe 
        &verb`);
    assert.lengthOf(results, 4);
  });

  it('listens to handle constraints - out connection', async () => {
    const results = await generatePlans(`
      recipe
        &verb
          a ->`);
    assert.lengthOf(results, 2);
    assert.lengthOf(results[0].result.particles, 1);
    assert.equal(results[0].result.particles[0].name, 'P');
    assert.lengthOf(results[1].result.particles, 2);
  });

  it('listens to handle constraints - in connection', async () => {
    const results = await generatePlans(`
      recipe 
        &verb
          a <-`);
    assert.lengthOf(results, 2);
    assert.lengthOf(results[1].result.particles, 1);
    assert.equal(results[1].result.particles[0].name, 'Q');
    assert.lengthOf(results[0].result.particles, 2);
  });

  it('listens to handle constraints - both connection', async () => {
    const results = await generatePlans(`
      recipe
        &verb
          a <-
          b ->
      `);
    assert.lengthOf(results, 2);
    assert.lengthOf(results[1].result.particles, 1);
    assert.equal(results[1].result.particles[0].name, 'Q');
    assert.lengthOf(results[0].result.particles, 2);
  });
  it('listens to handle constraints - handle', async () => {
    const results = await generatePlans(`
      recipe
        create as handle0
        &verb
          * -> handle0
      `);
    assert.lengthOf(results, 3);
    assert.deepEqual([['P'], ['P', 'Q'], ['Q']], results.map(r => r.result.particles.map(p => p.name)));
  });
  it('listens to slot constraints', async () => {
    const manifest = await Manifest.parse(`
      particle P in 'A.js'
        consume foo
          provide bar
    
      particle Q in 'B.js'
        consume boo
          provide far

      recipe &verb
        P

      recipe &verb
        Q

      recipe &verb
        P
        Q

      recipe
        &verb

      recipe
        &verb
          consume boo

      recipe
        &verb
          consume foo
            provide bar
    `);

    const arc = StrategyTestHelper.createTestArc(manifest);
    let inputParams = {generated: [{result: manifest.recipes[3], score: 1}]};
    const mrv = new MatchRecipeByVerb(arc);
    let results = await mrv.generate(inputParams);
    assert.lengthOf(results, 3);

    inputParams = {generated: [{result: manifest.recipes[4], score: 1}]};
    results = await mrv.generate(inputParams);
    assert.lengthOf(results, 2);
    assert.lengthOf(results[0].result.particles, 1);
    assert.equal(results[0].result.particles[0].name, 'Q');
    assert.lengthOf(results[1].result.particles, 2);

    inputParams = {generated: [{result: manifest.recipes[5], score: 1}]};
    results = await mrv.generate(inputParams);
    assert.lengthOf(results, 2);
    assert.lengthOf(results[0].result.particles, 1);
    assert.equal(results[0].result.particles[0].name, 'P');
    assert.lengthOf(results[1].result.particles, 2);
  });
  it('carries handle assignments across verb substitution', async () => {
    const manifest = await Manifest.parse(`
    
      particle P in 'A.js'
        in S {} a
      
      particle Q in 'B.js'
        out S {} b

      recipe &verb
        P

      recipe
        create as handle0
        &verb
          a <- handle0
        Q
          b -> handle0
    `);

    const arc = StrategyTestHelper.createTestArc(manifest);
    const inputParams = {generated: [{result: manifest.recipes[1], score: 1}]};
    const mrv = new MatchRecipeByVerb(arc);
    const results = await mrv.generate(inputParams);
    assert.lengthOf(results, 1);
    const recipe = results[0].result;
    assert.equal(recipe.particles[0].connections.a.handle, recipe.particles[1].connections.b.handle);
    assert.equal(recipe.particles[0].connections.a.handle.connections[0].particle, recipe.particles[0]);
    assert.equal(recipe.particles[1].connections.b.handle.connections[1].particle, recipe.particles[1]);
  });
  it('carries handle assignments across verb substitution with generic binding', async () => {
    const manifest = await Manifest.parse(`
    
      particle P in 'A.js'
        in S {} a
      
      particle Q in 'B.js'
        out S {} b

      recipe &verb
        P

      recipe
        create as handle0
        &verb
          * <- handle0
        Q
          b -> handle0
    `);

    const arc = StrategyTestHelper.createTestArc(manifest);
    const inputParams = {generated: [{result: manifest.recipes[1], score: 1}]};
    const mrv = new MatchRecipeByVerb(arc);
    const results = await mrv.generate(inputParams);
    assert.lengthOf(results, 1);
    const recipe = results[0].result;
    assert.equal(recipe.particles[0].connections.a.handle, recipe.particles[1].connections.b.handle);
    assert.equal(recipe.particles[0].connections.a.handle.connections[0].particle, recipe.particles[0]);
    assert.equal(recipe.particles[1].connections.b.handle.connections[1].particle, recipe.particles[1]);
  });
  it('selects the appropriate generic binding when handle assignments carry type information', async () => {
    const manifest = await Manifest.parse(`
    
      particle O in 'Z.js'
        in R {} x
        out S {} y

      particle P in 'A.js'
        in R {} x
        out S {} y
        in S {} a
      
      particle Q in 'B.js'
        out S {} b

      recipe &verb
        O
        P

      recipe
        create as handle0
        &verb
          * <- handle0
        Q
          b -> handle0
    `);

    const arc = StrategyTestHelper.createTestArc(manifest);
    const inputParams = {generated: [{result: manifest.recipes[1], score: 1}]};
    const mrv = new MatchRecipeByVerb(arc);
    const results = await mrv.generate(inputParams);
    assert.lengthOf(results, 1);
    const recipe = results[0].result;
    const particleP = recipe.particles.find(p => p.name === 'P');
    const particleQ = recipe.particles.find(p => p.name === 'Q');
    assert.equal(particleP.connections.a.handle, particleQ.connections.b.handle);
    assert.equal(particleP.connections.a.handle.connections[0].particle, particleP);
    assert.equal(particleQ.connections.b.handle.connections[1].particle, particleQ);
  });
  it('carries slot assignments across verb substitution', async () => {
    const manifest = await Manifest.parse(`
      particle P in 'A.js'
        consume foo
          provide bar  

      particle S in 'B.js'
        consume bar
          provide foo

      recipe &verb
        P
    
      recipe
        &verb
          consume foo
            provide bar as s0
        S
          consume bar as s0

      recipe
        &verb
          consume foo as s0
        S
          consume bar
            provide foo as s0
    `);

    const arc = StrategyTestHelper.createTestArc(manifest);
    let inputParams = {generated: [{result: manifest.recipes[1], score: 1}]};
    const mrv = new MatchRecipeByVerb(arc);
    let results = await mrv.generate(inputParams);
    assert.lengthOf(results, 1);
    let recipe = results[0].result;
    assert.equal(recipe.particles[0].consumedSlotConnections.foo.providedSlots.bar, recipe.particles[1].consumedSlotConnections.bar.targetSlot);
    assert.equal(recipe.slots[0].consumeConnections[0], recipe.particles[1].consumedSlotConnections.bar);
    assert.equal(recipe.slots[0].sourceConnection, recipe.particles[0].consumedSlotConnections.foo);
    
    inputParams = {generated: [{result: manifest.recipes[2], score: 1}]};
    results = await mrv.generate(inputParams);
    recipe = results[0].result;
    assert.equal(recipe.particles[0].consumedSlotConnections.foo.targetSlot, recipe.particles[1].consumedSlotConnections.bar.providedSlots.foo);
    const slotFoo = recipe.slots.find(s => s.name === 'foo');
    assert.equal(slotFoo.consumeConnections[0], recipe.particles[0].consumedSlotConnections.foo);
    assert.equal(slotFoo.sourceConnection, recipe.particles[1].consumedSlotConnections.bar);
  });

  it('carries slot assignments across when they\'re assigned elsewhere too', async () => {
    const manifest = await Manifest.parse(`
    particle P in 'A.js'
      consume foo
        provide bar  

    particle S in 'B.js'
      consume bar
        provide foo

    particle T in 'C.js'
      consume bar
      consume foo

    recipe &verb
      P
  
    recipe
      &verb
        consume foo
          provide bar as s0
      S
        consume bar as s0
      T
        consume bar as s0

    recipe
      &verb
        consume foo as s0
      S
        consume bar
          provide foo as s0
      T
        consume foo as s0
  `);

  const arc = StrategyTestHelper.createTestArc(manifest);
  let inputParams = {generated: [{result: manifest.recipes[1], score: 1}]};
  const mrv = new MatchRecipeByVerb(arc);
  let results = await mrv.generate(inputParams);
  assert.lengthOf(results, 1);
  let recipe = results[0].result;
  assert.equal(recipe.particles[0].consumedSlotConnections.foo.providedSlots.bar, recipe.particles[1].consumedSlotConnections.bar.targetSlot);
  assert.equal(recipe.slots[0].consumeConnections[0], recipe.particles[1].consumedSlotConnections.bar);
  assert.equal(recipe.slots[0].sourceConnection, recipe.particles[0].consumedSlotConnections.foo);
  assert.equal(recipe.particles[0].consumedSlotConnections.foo.providedSlots.bar, recipe.particles[2].consumedSlotConnections.bar.targetSlot);
  assert.equal(recipe.slots[0].consumeConnections[1], recipe.particles[2].consumedSlotConnections.bar);
  
  inputParams = {generated: [{result: manifest.recipes[2], score: 1}]};
  results = await mrv.generate(inputParams);
  recipe = results[0].result;
  assert.equal(recipe.particles[0].consumedSlotConnections.foo.targetSlot, recipe.particles[1].consumedSlotConnections.bar.providedSlots.foo);
  const slotFoo = recipe.slots.find(s => s.name === 'foo');
  assert.equal(slotFoo.consumeConnections[0], recipe.particles[0].consumedSlotConnections.foo);
  assert.equal(slotFoo.sourceConnection, recipe.particles[1].consumedSlotConnections.bar);
  assert.equal(recipe.particles[2].consumedSlotConnections.foo.targetSlot, recipe.particles[1].consumedSlotConnections.bar.providedSlots.foo);
  assert.equal(slotFoo.consumeConnections[1], recipe.particles[2].consumedSlotConnections.foo);
  });
});
