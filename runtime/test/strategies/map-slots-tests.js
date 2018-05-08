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

import {Arc} from '../../arc.js';
import {Manifest} from '../../manifest.js';
import {StrategyTestHelper} from './strategy-test-helper.js';
import {MapSlots} from '../../strategies/map-slots.js';
import {ResolveRecipe} from '../../strategies/resolve-recipe.js';
import {assert} from '../chai-web.js';

describe('MapSlots', function() {
  let particlesSpec = `
    particle A in 'A.js'
      consume root

    particle B in 'B.js'
      consume root`;

  let testManifest = async (recipeManifest, expectedSlots) => {
    let manifest = (await Manifest.parse(`
      ${particlesSpec}

      ${recipeManifest}
    `));
    let arc = StrategyTestHelper.createTestArc('test-plan-arc', manifest, 'dom');
    let recipe = await runMapSlotsAndResolveRecipe(arc, manifest.recipes[0]);

    if (expectedSlots >= 0) {
      assert.isTrue(recipe.isResolved());
      assert.equal(recipe.slots.length, expectedSlots);
    } else {
      assert.isFalse(recipe.normalize());
    }
  };

  let runMapSlotsAndResolveRecipe = async (arc, recipe, expectedSlots) => {
    let results = await StrategyTestHelper.theResults(arc, MapSlots, recipe);
    if (results.length == 1) {
      recipe = results[0];
    }

    results = await StrategyTestHelper.theResults(arc, ResolveRecipe, recipe);
    assert.equal(results.length, 1);
    return results[0];
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
    await testManifest(`
      recipe
        A as particle0
          consume root
        B as particle1
          consume root
    `, /* expectedSlots= */ 1);
  });

  it('map slots by tags', async () => {
    let manifest = (await Manifest.parse(`
      particle A in 'A.js'
        consume master #fancy

      recipe
        slot 'id0' #fancy as s0
        A
    `));

    let arc = StrategyTestHelper.createTestArc('test-plan-arc', manifest, 'dom');
    await StrategyTestHelper.onlyResult(arc, ResolveRecipe, manifest.recipes[0]);
  });

  it('allows to bind by name to any available slot', async () => {
    let manifest = (await Manifest.parse(`
      particle A in 'A.js'
        consume root
          provide detail

      particle B in 'B.js'
        consume root
          provide detail

      particle C in 'C.js'
        consume detail

      recipe
        A
        B
        C
    `));
    let inputParams = {generated: [{result: manifest.recipes[0], score: 1}]};
    let arc = StrategyTestHelper.createTestArc('test-plan-arc', manifest, 'dom');

    let strategy = new MapSlots(arc);
    let results = await strategy.generate(inputParams);
    assert.equal(results.length, 2);

    results = await new ResolveRecipe(arc).generate({
      generated: results.map(r => ({
        result: r.result,
        score: 1
      }))
    });

    assert.equal(results.length, 2);
    for (let result of results) {
      let plan = result.result;
      plan.normalize();
      assert.isTrue(plan.isResolved());
    }
  });

  it('prefers local slots if available', async () => {
    // Arc has both a 'root' and an 'action' slot.
    let arc = new Arc({id: 'test-plan-arc', slotComposer: {
      affordance: 'dom',
      getAvailableSlots: (() => [
        {name: 'root', id: 'r0', tags: ['#root'], handles: [], handleConnections: [], getProvidedSlotSpec: () => { return {isSet: false}; }},
        {name: 'action', id: 'r1', tags: ['#remote'], handles: [], handleConnections: [], getProvidedSlotSpec: () => { return {isSet: false}; }},
      ])
    }});

    let particles = `
      particle A in 'A.js'
        consume root
          provide action

      particle B in 'B.js'
        consume action`;

    async function assertActionSlotTags(recipe, tags) {
      let manifest = await Manifest.parse(
      `${particles}
       ${recipe}`);

      let result = await runMapSlotsAndResolveRecipe(arc, manifest.recipes[0]);
      assert.isTrue(result.isResolved());
      
      let actionSlots = result.slots.filter(s => s.name === 'action');
      assert.lengthOf(actionSlots, 1);
      assert.deepEqual(actionSlots[0].tags, tags);
    }

    // 'action' slot of particle B will bind to the remote slot
    // if no local slot is available.
    await assertActionSlotTags(`
      recipe
        B`,
      ['#remote']);

    // 'action' slot of particle B will bind to the local slot
    // provided by particle A if available.
    await assertActionSlotTags(`
      recipe
        A
        B`,
      []);
  });
});
