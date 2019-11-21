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
  it('find single required particle that provides a slot', async () => {
    const loader = new StubLoader({
      '*': `defineParticle(({Particle}) => class Noop extends Particle {});`
    });
    const manifest = (await Manifest.parse(`
      particle A in 'A.js'
        root: consumes Slot
          x: provides? Slot

      particle C
        c: consumes Slot

      recipe
        require
          A
            root: consumes
              x: provides s0
        C
          c: consumes s0

      recipe
        slot0: slot 'rootslotid-root'
        A
          root: consumes slot0
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
  });

  it('find single required particle that consumes slot', async () => {
    const loader = new StubLoader({
      '*': `defineParticle(({Particle}) => class Noop extends Particle {});`
    });
    const manifest = (await Manifest.parse(`
      particle A in 'A.js'
        b: consumes Slot

      particle C
        b: consumes Slot

      recipe
        require
          A
            b: consumes s0
        C
          b: consumes s0

      recipe
        slot0: slot 'rootslotid-root'
        A
          b: consumes slot0
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
        b: consumes Slot
          c: provides? Slot
      particle B in 'B.js'
        root: consumes Slot
          b: provides? Slot

      particle C
        c: consumes Slot
      particle D
        b: consumes Slot

      recipe
        require
          B
            root: consumes
              b: provides s1
          A
            b: consumes s1
              c: provides s0
        C
          c: consumes s0
        D
          b: consumes s1

      recipe
        slot0: slot 'rootslotid-root'
        slot1: slot 'slot0'
        slot2: slot 'slotIDs:A'
        B
          root: consumes slot0
            b: provides slot1
        A
          b: consumes slot1
            c: provides slot2
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
      b: consumes Slot
        c: provides? Slot
    particle B in 'B.js'
      root: consumes Slot
        b: provides? Slot

    particle C
      c: consumes Slot
    particle D
      b: consumes Slot

    recipe
      require
        B
          root: consumes
            b: provides s1
        A
          b: consumes s1
            c: provides s0
      C
        c: consumes s0
      D
        b: consumes s1

    recipe
      slot0: slot 'rootslotid-root'
      slot1: slot 'slot0'
      slot2: slot 'slotIDs:A'
      B
        root: consumes slot0
          b: provides slot1
      A
        b: consumes slot0
          c: provides slot2
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
      root: consumes Slot
        c: provides? Slot
    particle B in 'B.js'
      root: consumes Slot
        b: provides? Slot

    particle C
      b: consumes Slot
    particle D
      c: consumes Slot

    recipe
      require
        B
          root: consumes s1
            b: provides s0
        A
          root: consumes s1
            c: provides s2
      C
        b: consumes s0
      D
        c: consumes s2

    recipe
      slot0: slot 'rootslotid-root'
      slot1: slot 'slot0'
      slot2: slot 'slotIDs:A'
      B
        root: consumes slot0
          b: provides slot1
      A
        root: consumes slot1
          c: provides slot2
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
