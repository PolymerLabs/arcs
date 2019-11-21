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
import {Arc} from '../../../runtime/arc.js';
import {Loader} from '../../../platform/loader.js';
import {Manifest} from '../../../runtime/manifest.js';
import {FakeSlotComposer} from '../../../runtime/testing/fake-slot-composer.js';
import {MapSlots} from '../../strategies/map-slots.js';
import {ResolveRecipe} from '../../strategies/resolve-recipe.js';

import {StrategyTestHelper} from '../../testing/strategy-test-helper.js';
import {Id, ArcId} from '../../../runtime/id.js';
import {Flags} from '../../../runtime/flags.js';

describe('MapSlots', () => {
  const particlesSpec = `
      particle A in 'A.js'
        root: consumes Slot

      particle B in 'B.js'
        root: consumes Slot`;

  const testManifest = async (recipeManifest, expectedSlots) => {
    const manifest = (await Manifest.parse(`
${particlesSpec}

${recipeManifest}
    `));
    const arc = StrategyTestHelper.createTestArc(manifest);
    const recipe = await runMapSlotsAndResolveRecipe(arc, manifest.recipes[0]);

    if (expectedSlots >= 0) {
      assert.isTrue(recipe.isResolved());
      assert.lengthOf(recipe.slots, expectedSlots);
    } else {
      assert.isFalse(recipe.normalize());
    }
  };

  const runMapSlotsAndResolveRecipe = async (arc, recipe) => {
    let results = await StrategyTestHelper.theResults(arc, MapSlots, recipe);
    if (results.length === 1) {
      recipe = results[0];
    }

    results = await StrategyTestHelper.theResults(arc, ResolveRecipe, recipe);
    assert.lengthOf(results, 1);
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
          root: consumes
        B as particle1
    `, /* expectedSlots= */ 1);
  });
  it('predefined remote slots second explicit', async () => {
    await testManifest(`
      recipe
        A as particle0
        B as particle1
          root: consumes
    `, /* expectedSlots= */ 1);
  });
  it('predefined remote slots both have alias', async () => {
    await testManifest(`
      recipe
        A as particle0
          root: consumes slot0
        B as particle1
          root: consumes slot0
    `, /* expectedSlots= */ 1);
  });
  it('predefined remote slots both explicit', async () => {
    await testManifest(`
      recipe
        A as particle0
          root: consumes
        B as particle1
          root: consumes
    `, /* expectedSlots= */ 1);
  });

  it('map slots by tags', async () => {
    const manifest = (await Manifest.parse(`
      particle A in 'A.js'
        master: consumes Slot #fancy

      recipe
        s0: slot 'id0' #fancy
        A
    `));

    const arc = StrategyTestHelper.createTestArc(manifest);
    await StrategyTestHelper.onlyResult(arc, ResolveRecipe, manifest.recipes[0]);
  });

  it('allows to bind by name to any available slot', async () => {
    const manifest = (await Manifest.parse(`
      particle A in 'A.js'
        root: consumes Slot
          detail: provides? Slot

      particle B in 'B.js'
        root: consumes Slot
          detail: provides? Slot

      particle C in 'C.js'
        detail: consumes Slot

      recipe
        A
          root: consumes
        B
          root: consumes
        C
    `));
    const generated = [{result: manifest.recipes[0], score: 1}];
    const arc = StrategyTestHelper.createTestArc(manifest);

    const strategy = new MapSlots(arc);
    let results = await strategy.generateFrom(generated);
    assert.lengthOf(results, 2);

    results = await new ResolveRecipe(arc).generateFrom(
      results.map(r => ({
        result: r.result,
        score: 1
      })));

    assert.lengthOf(results, 2);
    for (const result of results) {
      const plan = result.result;
      plan.normalize();
      assert.isTrue(plan.isResolved());
    }
  });

  it('prefers local slots if available', async () => {
    // Arc has both a 'root' and an 'action' slot.
    const arc = new Arc({
      id: ArcId.newForTest('test-plan-arc'),
      loader: new Loader(),
      context: new Manifest({id: ArcId.newForTest('test')}),
      slotComposer: new FakeSlotComposer({containers: {root: {}, action: {}}})
    });

    const particles = `
      particle A in 'A.js'
        root: consumes? Slot
          action: provides? Slot

      particle B in 'B.js'
        action: consumes? Slot`;

    async function assertActionSlotTags(recipe, tags) {
      const manifest = await Manifest.parse(
      `${particles}
       ${recipe}`);

      const result = await runMapSlotsAndResolveRecipe(arc, manifest.recipes[0]);
      assert.isTrue(result.isResolved());

      const actionSlots = result.slots.filter(s => s.name === 'action');
      assert.lengthOf(actionSlots, 1);
      assert.deepEqual(actionSlots[0].tags, tags);
    }

    // 'action' slot of particle B will bind to the remote slot
    // if no local slot is available.
    await assertActionSlotTags(`
      recipe
        B`,
      ['action']);

    // 'action' slot of particle B will bind to the local slot
    // provided by particle A if available.
    await assertActionSlotTags(`
      recipe
        A
          root: consumes
        B`,
      []);
  });
});
