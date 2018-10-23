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

import {Manifest} from '../../ts-build/manifest.js';
import {StrategyTestHelper} from './strategy-test-helper.js';
import {CoalesceRecipes} from '../../strategies/coalesce-recipes.js';
import {assert} from '../chai-web.js';

async function tryCoalesceRecipes(manifestStr) {
  const manifest = await Manifest.parse(manifestStr);
  const recipes = manifest.recipes;
  assert.isTrue(recipes.every(recipe => recipe.normalize()));
  assert.isFalse(recipes.every(recipe => recipe.isResolved()));
  const arc = StrategyTestHelper.createTestArc('test-plan-arc', manifest, 'dom');
  const inputParams = {generated: [], terminal: recipes.map(recipe => ({result: recipe, score: 1}))};
  const strategy = new CoalesceRecipes(arc);
  return await strategy.generate(inputParams);
}
async function doNotCoalesceRecipes(manifestStr) {
  const results = await tryCoalesceRecipes(manifestStr);
  assert.isEmpty(results);
}
async function doCoalesceRecipes(manifestStr, options) {
  options = options || {};
  const results = await tryCoalesceRecipes(manifestStr);
  // dedup identical coalescing outputs
  const resultsMap = new Map();
  results.forEach(r => {
    if (!options.skipUnresolved || r.result.isResolved()) {
      resultsMap.set(r.result.toString(), r.result);
    }
  });
  assert.equal(1, resultsMap.size);
  return [...resultsMap.values()][0];
}

describe('CoalesceRecipes', function() {
  it('coalesces required slots', async () => {
    const recipe = await doCoalesceRecipes(`
      particle P1
        consume root
          must provide foo

      particle P2
        consume foo

      recipe
        slot 'id0' as slot0
        P1
          consume root as slot0
      recipe
        P2
    `);

    assert.isTrue(recipe.isResolved());
    assert.lengthOf(recipe.particles, 2);
    assert.lengthOf(recipe.slots, 2);
  });

  it('coalesces required slots with handles', async () => {
    const recipe = await doCoalesceRecipes(`
      schema Thing
      schema OtherThing
      particle P1
        in Thing thing
        consume root
          must provide foo
            handle thing

      particle P2
        in Thing thing
        out OtherThing other
        consume foo

      particle P3
        out Thing thing

      recipe
        slot 'id0' as slot0
        copy 'mything' as thingHandle
        P1
          thing = thingHandle
          consume root as slot0

      recipe
        use as thingHandle
        create as otherHandle
        P2
          thing = thingHandle
          other = otherHandle
        P3
          thing = thingHandle

      resource MyThing
          start
          []
      store Store0 of Thing 'mything' in MyThing
    `);

    assert.isTrue(recipe.isResolved());
    assert.lengthOf(recipe.particles, 3);
    assert.lengthOf(recipe.slots, 2);
  });

  it('ignores host connections for handle requirements', async () => {
    const recipe = await doCoalesceRecipes(`
      schema Thing
      particle P1
        inout Thing thing
        consume root
          must provide foo
            handle thing

      shape HostedShape
        in ~a *
      particle P2
        host HostedShape hostedParticle
        in Thing thing
        consume foo

      recipe
        slot 'id0' as slot0
        copy as thingHandle
        P1
          thing = thingHandle
          consume root as slot0

      recipe
        use as thingHandle
        P2
          thing = thingHandle
    `);

    assert.isTrue(Object.isFrozen(recipe), 'recipe should be valid');
    assert.lengthOf(recipe.particles, 2);
    assert.lengthOf(recipe.slots, 2);

    // hostedParticle connection should not be affected.
    const p2 = recipe.particles.find(p => p.name === 'P2');
    assert.isUndefined(p2.connections['hostedParticle'].handle);
  });

  it('does not coalesce required slots if handle constraint is not met', async () => {
    await doNotCoalesceRecipes(`
      schema Thing
      particle P1
        inout Thing thing
        consume root
          must provide foo
            handle thing
      particle P2
        consume foo
      recipe
        slot 'id0' as slot0
        create as thingHandle
        P1
          thing = thingHandle
          consume root as slot0
      recipe
        P2
    `);
  });

  it('evaluates fates of handles of required slot in coalesced recipes', async () => {
    const parseManifest = async (options) => {
      return `
        schema Thing

        particle P1
          in Thing thing
          consume root
            must provide foo
              handle thing

        particle P2
          in Thing thing
          ${options.outThingB ? 'out Thing outThing' : ''}
          consume foo

        recipe A
          slot 'id0' as slot0
          ${options.fateA} as thingHandle
          P1
            thing = thingHandle
            consume root as slot0

        recipe B
          ${options.fateB ? `${options.fateB} as thingHandle` : ``}
          P2
            ${options.fateB ? 'thing = thingHandle' : ''}
            ${options.outThingB ? 'outThing = thingHandle' : ''}
      `;
    };

    await doCoalesceRecipes(await parseManifest({fateA: 'map'}));
    await doCoalesceRecipes(await parseManifest({fateA: 'map', fateB: 'map'}));
    await doCoalesceRecipes(await parseManifest({fateA: 'map', fateB: 'use'}));
    await doCoalesceRecipes(await parseManifest({fateA: 'map', fateB: '?'}));
    await doNotCoalesceRecipes(await parseManifest({fateA: 'map', fateB: 'use', outThingB: true}));
    await doNotCoalesceRecipes(await parseManifest({fateA: 'map', fateB: 'copy'}));
    await doCoalesceRecipes(await parseManifest({fateA: 'copy'}));
    await doCoalesceRecipes(await parseManifest({fateA: 'copy', fateB: 'map'}));
    await doCoalesceRecipes(await parseManifest({fateA: 'copy', fateB: 'copy'}));
    await doNotCoalesceRecipes(await parseManifest({fateA: 'copy', fateB: 'create'}));

    await doCoalesceRecipes(await parseManifest({fateA: 'use', fateB: 'use'}));
    await doCoalesceRecipes(await parseManifest({fateA: 'use', fateB: 'use', outThingB: true}));
    await doCoalesceRecipes(await parseManifest({fateA: 'use', fateB: '?'}));
    await doCoalesceRecipes(await parseManifest({fateA: 'use', fateB: '?', outThingB: true}));
    await doNotCoalesceRecipes(await parseManifest({fateA: 'use', fateB: 'create'}));
    await doNotCoalesceRecipes(await parseManifest({fateA: 'use', fateB: 'map'}));
    await doNotCoalesceRecipes(await parseManifest({fateA: 'use', fateB: 'copy'}));

    await doCoalesceRecipes(await parseManifest({fateA: 'create'}));
    await doCoalesceRecipes(await parseManifest({fateA: 'create', fateB: '?'}));
    await doCoalesceRecipes(await parseManifest({fateA: 'create', fateB: 'use'}));
    await doCoalesceRecipes(await parseManifest({fateA: 'create', fateB: 'use', outThingB: true}));
    await doNotCoalesceRecipes(await parseManifest({fateA: 'create', fateB: 'create'}));
    await doNotCoalesceRecipes(await parseManifest({fateA: 'create', fateB: 'map'}));
    await doNotCoalesceRecipes(await parseManifest({fateA: 'create', fateB: 'copy'}));
  });

  it('coalesces multiple handles', async () => {
    const recipe = await doCoalesceRecipes(`
      schema Thing1
      schema Thing2
      schema Thing3
      particle P1
        in Thing1 thing1
        in [Thing2] thing2
        in BigCollection<Thing3> thing3
      particle P2
        out Thing1 thing1
        out [Thing2] thing2
        out BigCollection<Thing3> thing3
      recipe
        use as handle1
        use as handle2
        use as handle3
        P1
          thing1 <- handle1
          thing2 <- handle2
          thing3 <- handle3
      recipe
        create as handle1
        create as handle2
        create as handle3
        P2
          thing1 -> handle1
          thing2 -> handle2
          thing3 -> handle3
      `);
    assert.lengthOf(recipe.handles, 3);
    recipe.handles.forEach(handle => assert.lengthOf(handle.connections, 2));
  });

  it('coalesces multiple handles while coalescing slots', async () => {
    const recipe = await doCoalesceRecipes(`
      schema Thing1
      schema Thing2
      particle P1
        consume root
          provide action
        inout Thing1 thing1
        inout Thing2 thing2
      particle P2
        must consume action
        inout Thing1 thing1
        inout Thing2 thing2
      recipe
        create as handle1
        create as handle2
        P2
          thing1 = handle1
          thing2 = handle2
      recipe
        create as handle1
        create as handle2
        slot 'rootslot-0' as slot0
        P1
          thing1 = handle1
          thing2 = handle2
          consume root as slot0
      `, {skipUnresolved: true});
    assert.lengthOf(recipe.handles, 2);
    recipe.handles.forEach(handle => assert.lengthOf(handle.connections, 2));
  });

  it('coalesces recipe descriptions', async () => {
    const recipe = await doCoalesceRecipes(`
      schema Thing
      particle P1
        in Thing inThing
      recipe
        ? as inHandle
        P1
          inThing <- inHandle
        description \`input thing\`
      particle P2
        out Thing outThing
      recipe
        create as outHandle
        P2
          outThing -> outHandle
        description \`output thing\`
    `);
    assert.isTrue(recipe.isResolved());
    assert.deepEqual(['input thing', 'output thing'], recipe.patterns);
  });

  it('coalesces for unresolved consume slots', async () => {
    await doCoalesceRecipes(`
      schema Thing
      particle P1
        out Thing outThing
        must consume foo
      recipe
        create as outHandle
        P1
          outThing -> outHandle
      particle P2
        consume root
          provide foo
      recipe
        slot 'root-slot' as rootSlot
        P2
          consume root as rootSlot
    `);
  });
});
