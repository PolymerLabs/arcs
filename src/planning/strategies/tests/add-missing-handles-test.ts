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
import {AddMissingHandles} from '../../strategies/add-missing-handles.js';

import {StrategyTestHelper} from '../../testing/strategy-test-helper.js';

async function runStrategy(manifestStr) {
  const manifest = await Manifest.parse(manifestStr);
  const recipes = manifest.recipes;
  recipes.forEach(recipe => recipe.normalize());
  const inputParams = {generated: recipes.map(recipe => ({result: recipe, score: 1}))};
  const strategy = new AddMissingHandles(StrategyTestHelper.createTestArc(manifest));
  return (await strategy.generate(inputParams)).map(r => r.result);
}

describe('AddMissingHandles', () => {
  it(`doesn't add handles if there are constraints`, async () => {
    assert.isEmpty(await runStrategy(`
      schema Thing
      particle P1
        thing: writes Thing

      particle P2
        thing: reads Thing

      recipe
        P1.thing: writes P2.thing
        P1
        P2
    `));
  });
  it(`doesn't add handles if there are free handles`, async () => {
    assert.isEmpty(await runStrategy(`
      schema Thing
      particle P1
        thing: reads Thing

      recipe
        free: create *
        P1
    `));
  });
  it(`adds handles to free connections`, async () => {
    const results = await runStrategy(`
      schema Thing
      particle P1
        thing: reads Thing
        otherThing: writes Thing
      particle P2
        yetAnother: reads writes Thing

      recipe
        P1
        P2
    `);
    assert.lengthOf(results, 1);
    const recipe = results[0];
    assert.lengthOf(recipe.handles, 3);
    assert.isTrue(recipe.handles.every(h => h.fate === '?'));
  });
  it(`doesn't add handles to host connections`, async () => {
    const results = await runStrategy(`
      schema Thing
      interface HostedInterface
        reads ~a
      particle P1
        thing: reads Thing
        hosted: hosts HostedInterface
      recipe
        P1
    `);
    assert.lengthOf(results, 1);
    const recipe = results[0];
    assert.lengthOf(recipe.handles, 1);
    assert.isUndefined(recipe.particles[0].connections['hosted']);
  });
});
