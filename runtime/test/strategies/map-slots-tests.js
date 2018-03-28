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
import MapSlots from '../../strategies/map-slots.js';
import ResolveRecipe from '../../strategies/resolve-recipe.js';
import {assert} from '../chai-web.js';

describe('MapSlots', function() {
  let particlesSpec = `
    particle A in 'A.js'
      A()
      consume root

    particle B in 'B.js'
      B()
      consume root`;

  let testManifest = async (recipeManifest, expectedSlots, Strategy) => {
    let manifest = (await Manifest.parse(`
      ${particlesSpec}

      ${recipeManifest}
    `));
    let inputParams = {generated: [{result: manifest.recipes[0], score: 1}]};
    let arc = StrategyTestHelper.createTestArc('test-plan-arc', manifest, 'dom');

    let results = await new MapSlots(arc).generate(inputParams);
    if (results.length == 1) {
      inputParams = {generated: [{result: results[0].result, score: 1}]};
    }

    results = await new ResolveRecipe(arc).generate(inputParams);
    assert.equal(results.length, 1);
    let recipe = results[0].result;

    if (expectedSlots >= 0) {
      assert.isTrue(recipe.isResolved());
      assert.equal(recipe.slots.length, expectedSlots);
    } else {
      assert.isFalse(recipe.normalize());
    }
  };

  it('predefined remote slots no alias', async () => {
    await testManifest(`
      recipe
        A as particle0
        B as particle1
    `, /* expectedSlots= */ 1);
  });
  it('predefined remote slots first explicit', async () => {
    await testManifest(`
      recipe
        A as particle0
          consume root
        B as particle1
    `, /* expectedSlots= */ 1);
  });
  it('predefined remote slots second explicit', async () => {
    await testManifest(`
      recipe
        A as particle0
        B as particle1
          consume root
    `, /* expectedSlots= */ 1);
  });
  it('predefined remote slots both have alias', async () => {
    await testManifest(`
      recipe
        A as particle0
          consume root as slot0
        B as particle1
          consume root as slot0
    `, /* expectedSlots= */ 1);
  });
  it('predefined remote slots both explicit', async () => {
    // This recipe is invalid, because particles consume different names,
    // but only one suitable slot is provided. This results in 2 duplicate recipe slots
    // being assigned the same slot ID, which is invalid.
    await testManifest(`
      recipe
        A as particle0
          consume root
        B as particle1
          consume root
    `, /* expectedSlots= */ -1);
  });

  it('map slots by tags', async () => {
    let manifest = (await Manifest.parse(`
      particle A in 'A.js'
        A()
        consume master #root
          provide detail #info #detail

      particle B in 'B.js'
        B()
        consume info #detail #more

      recipe
        slot 'id0' #root as s0
        A
        B
    `));
    let inputParams = {generated: [{result: manifest.recipes[0], score: 1}]};
    let arc = StrategyTestHelper.createTestArc('test-plan-arc', manifest, 'dom');

    let strategy = new MapSlots(arc);
    let results = await strategy.generate(inputParams);
    assert.equal(results.length, 1);

    let plan = results[0].result;

    strategy = new ResolveRecipe(arc);
    results = await strategy.generate({generated: [{result: plan, score: 1}]});
    assert.equal(results.length, 1);

    plan = results[0].result;

    assert.equal(plan.slots.length, 2);
    plan.normalize();
    assert.isTrue(plan.isResolved());
  });
});
