/**
 * @license
 * Copyright (c) 2018 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import {assert} from '../chai-web.js';
import Manifest from '../../manifest.js';
import ResolveRecipe from '../../strategies/resolve-recipe.js';
import StrategyTestHelper from './strategy-test-helper.js';

let {createTestArc, onlyResult, theResults} = StrategyTestHelper;

describe('resolve recipe', function() {
  it('does not resolve a mapping of a handle with an invalid type', async () => {
    let manifest = await Manifest.parse(`
      schema Car
        Number doors
      schema Tesla extends Car
        Boolean bioweaponDefenceMode

      particle P in 'p.js'
        P(in Tesla param)

      recipe
        copy as handle
        P
          param <- handle

      store TestStore of Car in EmptyListJson
      resource EmptyListJson
        start
        []
    `);

    let arc = createTestArc('test-plan-arc', manifest, 'dom');
    let [recipe] = manifest.recipes;
    assert.isTrue(recipe.normalize());

    recipe = await onlyResult(arc, ResolveRecipe, recipe);
    assert.isFalse(recipe.normalize());
  });

  it('resolves a mapping of a handle with a less specific entity type', async () => {
    let manifest = await Manifest.parse(`
      schema Car
        Number doors
      schema Tesla extends Car
        Boolean bioweaponDefenceMode

      particle P in 'p.js'
        P(out Tesla param)

      recipe
        copy as handle
        P
          param -> handle

      store TestStore of Car in EmptyListJson
      resource EmptyListJson
        start
        []
    `);

    let arc = createTestArc('test-plan-arc', manifest, 'dom');
    let [recipe] = manifest.recipes;
    assert.isTrue(recipe.normalize());

    recipe = await onlyResult(arc, ResolveRecipe, recipe);
    assert.isTrue(recipe.isResolved());
  });

  it('resolves a mapping of a handle with a more specific entity type', async () => {
    let manifest = await Manifest.parse(`
      schema Car
        Number doors
      schema Tesla extends Car
        Boolean bioweaponDefenceMode

      particle P in 'p.js'
        P(in Car param)

      recipe
        copy as handle
        P
          param <- handle

      store TestStore of Tesla in EmptyListJson
      resource EmptyListJson
        start
        []
    `);

    let arc = createTestArc('test-plan-arc', manifest, 'dom');
    let [recipe] = manifest.recipes;
    assert.isTrue(recipe.normalize());

    recipe = await onlyResult(arc, ResolveRecipe, recipe);
    assert.isTrue(recipe.isResolved());
  });

  it('resolves a mapping of a handle with an equivalent entity type', async () => {
    let manifest = await Manifest.parse(`
      schema Car
        Number doors
      schema Tesla extends Car
        Boolean bioweaponDefenceMode

      particle P in 'p.js'
        P(in Tesla param)

      recipe
        copy as handle
        P
          param <- handle

      store TestStore of Tesla in EmptyListJson
      resource EmptyListJson
        start
        []
    `);

    let arc = createTestArc('test-plan-arc', manifest, 'dom');
    let [recipe] = manifest.recipes;
    assert.isTrue(recipe.normalize());

    recipe = await onlyResult(arc, ResolveRecipe, recipe);
    assert.isTrue(recipe.isResolved());
  });
});
