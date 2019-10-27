/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */


import {assert} from '../../../platform/chai-web.js';
import {Manifest} from '../../../runtime/manifest.js';
import {StubLoader} from '../../../runtime/testing/stub-loader.js';
import {FindRequiredParticle} from '../../strategies/find-required-particle.js';

import {StrategyTestHelper} from '../../testing/strategy-test-helper.js';
import {Flags} from '../../../runtime/flags.js';

describe('FindRequiredParticles', () => {
  it('find single required particle that provides a slot', Flags.withPreSlandlesSyntax(async () => {
    const loader = new StubLoader({
      '*': `defineParticle(({Particle}) => class Noop extends Particle {});`
    });
    const manifest = (await Manifest.parse(`
      particle A in 'A.js'
        consume root
          provide x
    
      particle C
        consume c 
      
      recipe 
        require
          A
            consume root
              provide x as s0
        C
          consume c as s0
      
      recipe
        slot 'rootslotid-root' as slot
        A
          consume root as slot
    `));
    const recipes = manifest.recipes;
    assert.isTrue(recipes.every(recipe => recipe.normalize()));
    const arc = StrategyTestHelper.createTestArc(manifest, {loader});
    await arc.instantiate(recipes[1]);
    const strategy = new FindRequiredParticle(arc, StrategyTestHelper.createTestStrategyArgs(arc));
    const inputParams = recipes.map(recipe => ({result: recipe, score: 1}));
    const results = await strategy.generateFrom(inputParams);
    const recipe = results[0].result;
    assert.isTrue(recipe.slots[0].id === arc.activeRecipe.slots[1].id, 'results recipe does not have the correct slot');
    assert.isTrue(recipe.isResolved());
    await arc.instantiate(recipe);
    assert.isTrue(arc.activeRecipe.normalize());
  }));

  it('find single required particle that consumes slot', async () => {
    const loader = new StubLoader({
      '*': `defineParticle(({Particle}) => class Noop extends Particle {});`
    });
    const manifest = (await Manifest.parse(`
      particle A in 'A.js'
        consume b
    
      particle C
        consume b
      
      recipe 
        require
          A
            consume b as s0
        C
          consume b as s0
      
      recipe
        slot 'rootslotid-root' as slot
        A
          consume b as slot
    `));
    const recipes = manifest.recipes;
    assert.isTrue(recipes.every(recipe => recipe.normalize()));
    const arc = StrategyTestHelper.createTestArc(manifest, {loader});
    await arc.instantiate(recipes[1]);
    const strategy = new FindRequiredParticle(arc, StrategyTestHelper.createTestStrategyArgs(arc));
    const inputParams = recipes.map(recipe => ({result: recipe, score: 1}));
    const results = await strategy.generateFrom(inputParams);
    const recipe = results[0].result;
    assert.isTrue(recipe.slots[0].id === arc.activeRecipe.slots[0].id, 'results recipe does not have the correct slot');
    assert.isTrue(recipe.isResolved());
    await arc.instantiate(recipe);
    assert.isTrue(arc.activeRecipe.normalize());
  });

  it('find two required particles', async () => {
    const loader = new StubLoader({
      '*': `defineParticle(({Particle}) => class Noop extends Particle {});`
    });
    const manifest = (await Manifest.parse(`
      particle A in 'A.js'
        consume b
          provide c
      particle B in 'B.js'
        consume root
          provide b
    
      particle C
        consume c
      particle D 
        consume b
      
      recipe 
        require
          B
            consume root
              provide b as s1
          A
            consume b as s1
              provide c as s0
        C
          consume c as s0
        D
          consume b as s1
      
      recipe
        slot 'rootslotid-root' as slot
        slot 'slot0' as slot1
        slot 'slotIDs:A' as slot2
        B
          consume root as slot
            provide b as slot1
        A
          consume b as slot1
            provide c as slot2
    `));
    const recipes = manifest.recipes;
    assert.isTrue(recipes.every(recipe => recipe.normalize()));
    const arc = StrategyTestHelper.createTestArc(manifest, {loader});
    await arc.instantiate(recipes[1]);
    const strategy = new FindRequiredParticle(arc, StrategyTestHelper.createTestStrategyArgs(arc));
    const inputParams = recipes.map(recipe => ({result: recipe, score: 1}));
    const results = await strategy.generateFrom(inputParams);
    const recipe = results[0].result;
    assert.isTrue(recipe.slots[0].id === arc.activeRecipe.slots[0].id, 'first slot in results recipe is not the correct slot');
    assert.isTrue(recipe.slots[1].id === arc.activeRecipe.slots[1].id, 'second slot in results recipe is not the correct slots');
    assert.isTrue(recipe.isResolved());
    await arc.instantiate(recipe);
    assert.isTrue(arc.activeRecipe.normalize());
  });
  it('required particle can not provide a slot that\'s provided by the shell', async () => {
    const loader = new StubLoader({
      '*': `defineParticle(({Particle}) => class Noop extends Particle {});`
    });
    const manifest = (await Manifest.parse(`
    particle A in 'A.js'
      consume b
        provide c
    particle B in 'B.js'
      consume root
        provide b

    particle C
      consume c
    particle D 
      consume b
    
    recipe 
      require
        B
          consume root
            provide b as s1
        A
          consume b as s1
            provide c as s0
      C
        consume c as s0
      D
        consume b as s1
      
    recipe
      slot 'rootslotid-root' as slot
      slot 'slot0' as slot1
      slot 'slotIDs:A' as slot2
      B
        consume root as slot
          provide b as slot1
      A
        consume b as slot
          provide c as slot2
    `));
    const recipes = manifest.recipes;
    assert.isTrue(recipes.every(recipe => recipe.normalize()));
    const arc = StrategyTestHelper.createTestArc(manifest, {loader});
    await arc.instantiate(recipes[1]);
    const strategy = new FindRequiredParticle(arc, StrategyTestHelper.createTestStrategyArgs(arc));
    const inputParams = recipes.map(recipe => ({result: recipe, score: 1}));
    const results = await strategy.generateFrom(inputParams);
    const recipe = results[0].result;
    assert.isFalse(recipe.isResolved(), 'recipe is resolved when it shouldn\'t be');
  });
  it('find two required particles that doesn\'t match the require section', async () => {
    const loader = new StubLoader({
      '*': `defineParticle(({Particle}) => class Noop extends Particle {});`
    });
    // The require section expects A and B to consume the same slot. The active recipe has A and B consume different slots.
    const manifest = (await Manifest.parse(`
    particle A in 'A.js'
      consume root
        provide c
    particle B in 'B.js'
      consume root
        provide b

    particle C
      consume b
    particle D
      consume c
    
    recipe 
      require
        B
          consume root as s1
            provide b as s0
        A
          consume root as s1
            provide c as s2
      C
        consume b as s0
      D 
        consume c as s2

      
    recipe
      slot 'rootslotid-root' as slot
      slot 'slot0' as slot1
      slot 'slotIDs:A' as slot2
      B
        consume root as slot
          provide b as slot1
      A
        consume root as slot1
          provide c as slot2
    `));
    const recipes = manifest.recipes;
    assert.isTrue(recipes.every(recipe => recipe.normalize()));
    const arc = StrategyTestHelper.createTestArc(manifest, {loader});
    await arc.instantiate(recipes[1]);
    const strategy = new FindRequiredParticle(arc, StrategyTestHelper.createTestStrategyArgs(arc));
    const inputParams = recipes.map(recipe => ({result: recipe, score: 1}));
    const results = await strategy.generateFrom(inputParams);
    const recipe = results[0].result;
    assert.isFalse(recipe.isResolved(), 'recipe is resolved when it shouldn\'t be');
  });

});
