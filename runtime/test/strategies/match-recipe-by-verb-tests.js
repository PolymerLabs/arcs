/**
 * @license
 * Copyright (c) 2018 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
'use strict';

import Manifest from '../../manifest.js';
import StrategyTestHelper from './strategy-test-helper.js';
import MatchRecipeByVerb from '../../strategies/match-recipe-by-verb.js';
import ConvertConstraintsToConnections from '../../strategies/convert-constraints-to-connections.js';
import {assert} from '../chai-web.js';

describe('MatchRecipeByVerb', function() {
  it('removes a particle and adds a recipe', async () => {
    let manifest = await Manifest.parse(`
      recipe
        particle can jump

      schema Feet
      schema Energy

      particle JumpingBoots in 'A.js'
        JumpingBoots(in Feet f, in Energy e)
      particle FootFactory in 'B.js'
        FootFactory(out Feet f)
      particle NuclearReactor in 'C.js'
        NuclearReactor(out Energy e)

      recipe jump
        JumpingBoots.f <- FootFactory.f
        JumpingBoots.e <- NuclearReactor.e
    `);

    let arc = StrategyTestHelper.createTestArc('test-plan-arc', manifest, 'dom');
    let inputParams = {generated: [{result: manifest.recipes[0], score: 1}]};
    let mrv = new MatchRecipeByVerb(arc);
    let results = await mrv.generate(inputParams);
    assert.equal(results.length, 1);
    assert.equal(results[0].result.particles.length, 0);
    assert.deepEqual(results[0].result.toString(), 'recipe\n  JumpingBoots.e -> NuclearReactor.e\n  JumpingBoots.f -> FootFactory.f');
  });
  it('plays nicely with constraints', async () => {
    let manifest = await Manifest.parse(`
      schema S
      particle P in 'A.js'
        P(out S p)
      particle Q in 'B.js'
        Q(in S q)

      recipe
        P.p -> Q.q
        particle can a

      recipe a
        P
    `);

    let arc = StrategyTestHelper.createTestArc('test-plan-arc', manifest, 'dom');
    let inputParams = {generated: [{result: manifest.recipes[0], score: 1}]};
    let mrv = new MatchRecipeByVerb(arc);
    let results = await mrv.generate(inputParams);
    assert.equal(results.length, 1);
    let cctc = new ConvertConstraintsToConnections(arc);
    results = await cctc.generate({generated: results});
    assert.equal(results.length, 1);
    assert.deepEqual(results[0].result.toString(),
`recipe
  create as view0 // S {}
  P as particle0
    p -> view0
  Q as particle1
    q <- view0`);
  });
  it('listens to handle constraints', async () => {
    let manifest = await Manifest.parse(`
    particle P in 'A.js'
      P(out S {} a)
    
    particle Q in 'B.js'
      Q(in S {} a, out S {} b)

    particle R in 'C.js'
      R(in S {} c)

    recipe verb
      P
    
    recipe verb
      P
      Q
    
    recipe verb
      Q

    recipe verb
      R

    recipe 
      particle can verb
    
    recipe
      particle can verb
        a ->
    
    recipe
      particle can verb
        a <-
    
    recipe
      particle can verb
        a <-
        b ->
    
    recipe
      particle can verb
        * ->
    `);

    let arc = StrategyTestHelper.createTestArc('test-plan-arc', manifest, 'dom');
    let inputParams = {generated: [{result: manifest.recipes[4], score: 1}]};
    let mrv = new MatchRecipeByVerb(arc);
    let results = await mrv.generate(inputParams);
    assert.equal(results.length, 4);

    inputParams = {generated: [{result: manifest.recipes[5], score: 1}]};
    results = await mrv.generate(inputParams);
    assert.equal(results.length, 2);
    assert.equal(results[0].result.particles.length, 1);
    assert.equal(results[0].result.particles[0].name, 'P');
    assert.equal(results[1].result.particles.length, 2);
    
    inputParams = {generated: [{result: manifest.recipes[6], score: 1}]};
    results = await mrv.generate(inputParams);
    assert.equal(results.length, 2);
    assert.equal(results[1].result.particles.length, 1);
    assert.equal(results[1].result.particles[0].name, 'Q');
    assert.equal(results[0].result.particles.length, 2);
    
    inputParams = {generated: [{result: manifest.recipes[7], score: 1}]};
    results = await mrv.generate(inputParams);
    assert.equal(results.length, 2);
    assert.equal(results[1].result.particles.length, 1);
    assert.equal(results[1].result.particles[0].name, 'Q');
    assert.equal(results[0].result.particles.length, 2);

    inputParams = {generated: [{result: manifest.recipes[8], score: 1}]};
    results = await mrv.generate(inputParams);
    assert.equal(results.length, 3);
  })
  it('listens to slot constraints', async () => {
    let manifest = await Manifest.parse(`
      particle P in 'A.js'
        P()
        consume foo
          provide bar
    
      particle Q in 'B.js'
        Q()
        consume boo
          provide far

      recipe verb
        P

      recipe verb
        Q

      recipe verb
        P
        Q

      recipe
        particle can verb

      recipe
        particle can verb
          consume boo

      recipe
        particle can verb
          consume foo
            provide bar
    `);

    let arc = StrategyTestHelper.createTestArc('test-plan-arc', manifest, 'dom');
    let inputParams = {generated: [{result: manifest.recipes[3], score: 1}]};
    let mrv = new MatchRecipeByVerb(arc);
    let results = await mrv.generate(inputParams);
    assert.equal(results.length, 3);

    inputParams = {generated: [{result: manifest.recipes[4], score: 1}]};
    results = await mrv.generate(inputParams);
    assert.equal(results.length, 2);
    assert.equal(results[0].result.particles.length, 1);
    assert.equal(results[0].result.particles[0].name, 'Q');
    assert.equal(results[1].result.particles.length, 2);

    inputParams = {generated: [{result: manifest.recipes[5], score: 1}]};
    results = await mrv.generate(inputParams);
    assert.equal(results.length, 2);
    assert.equal(results[0].result.particles.length, 1);
    assert.equal(results[0].result.particles[0].name, 'P');
    assert.equal(results[1].result.particles.length, 2);
  });
  it.only('carries handle assignments across verb substitution', async () => {
    let manifest = await Manifest.parse(`
    
      particle P in 'A.js'
        P(in S {} a)
      
      particle Q in 'B.js'
        Q(out S {} b)

      recipe verb
        P

      recipe
        create as v0
        particle can verb
          a <- v0
        Q
          b -> v0
    `);

    let arc = StrategyTestHelper.createTestArc('test-plan-arc', manifest, 'dom');
    let inputParams = {generated: [{result: manifest.recipes[1], score: 1}]};
    let mrv = new MatchRecipeByVerb(arc);
    let results = await mrv.generate(inputParams);
    assert.equal(results.length, 1);
    let recipe = results[0].result;
    assert.equal(recipe.particles[0].connections.a.handle, recipe.particles[1].connections.b.handle);
    assert.equal(recipe.particles[0].connections.a.handle.connections[0].particle, recipe.particles[0]);
    // XXX: WHY is there 3 connections from this handle?!
    assert.equal(recipe.particles[1].connections.b.handle.connections[2].particle, recipe.particles[1]);
  });
  it('carries slot assignments across verb substitution', async () => {
    let manifest = await Manifest.parse(`
      particle P in 'A.js'
        P()
        consume foo
          provide bar  

      particle S in 'B.js'
        S()
        consume bar
          provide foo

      recipe verb
        P
    
      recipe
        particle can verb
          consume foo
            provide bar as s0
        S
          consume bar as s0

      recipe
        particle can verb
          consume foo as s0
        S
          consume bar
            provide foo as s0
    `);

    let arc = StrategyTestHelper.createTestArc('test-plan-arc', manifest, 'dom');
    let inputParams = {generated: [{result: manifest.recipes[1], score: 1}]};
    let mrv = new MatchRecipeByVerb(arc);
    let results = await mrv.generate(inputParams);
    assert.equal(results.length, 1);
    let recipe = results[0].result;
    assert.equal(recipe.particles[0].consumedSlotConnections.foo.providedSlots.bar, recipe.particles[1].consumedSlotConnections.bar.targetSlot);
    assert.equal(recipe.slots[0].consumeConnections[0], recipe.particles[1].consumedSlotConnections.bar);
    assert.equal(recipe.slots[0].sourceConnection, recipe.particles[0].consumedSlotConnections.foo);
    
    inputParams = {generated: [{result: manifest.recipes[2], score: 1}]};
    results = await mrv.generate(inputParams);
    recipe = results[0].result;
    assert.equal(recipe.particles[0].consumedSlotConnections.foo.targetSlot, recipe.particles[1].consumedSlotConnections.bar.providedSlots.foo);
    assert.equal(recipe.slots[1].consumeConnections[0], recipe.particles[0].consumedSlotConnections.foo);
    assert.equal(recipe.slots[1].sourceConnection, recipe.particles[1].consumedSlotConnections.bar);
  });

  it('carries slot assignments across when they\'re assigned elsewhere too', async () => {
    let manifest = await Manifest.parse(`
    particle P in 'A.js'
      P()
      consume foo
        provide bar  

    particle S in 'B.js'
      S()
      consume bar
        provide foo

    particle T in 'C.js'
      T()
      consume bar
      consume foo

    recipe verb
      P
  
    recipe
      particle can verb
        consume foo
          provide bar as s0
      S
        consume bar as s0
      T
        consume bar as s0

    recipe
      particle can verb
        consume foo as s0
      S
        consume bar
          provide foo as s0
      T
        consume foo as s0
  `);

  let arc = StrategyTestHelper.createTestArc('test-plan-arc', manifest, 'dom');
  let inputParams = {generated: [{result: manifest.recipes[1], score: 1}]};
  let mrv = new MatchRecipeByVerb(arc);
  let results = await mrv.generate(inputParams);
  assert.equal(results.length, 1);
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
  assert.equal(recipe.slots[1].consumeConnections[0], recipe.particles[0].consumedSlotConnections.foo);
  assert.equal(recipe.slots[1].sourceConnection, recipe.particles[1].consumedSlotConnections.bar);
  assert.equal(recipe.particles[2].consumedSlotConnections.foo.targetSlot, recipe.particles[1].consumedSlotConnections.bar.providedSlots.foo);
  assert.equal(recipe.slots[1].consumeConnections[1], recipe.particles[2].consumedSlotConnections.foo);
  });
});
