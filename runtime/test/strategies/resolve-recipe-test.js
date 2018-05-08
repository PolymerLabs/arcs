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
import {Manifest} from '../../manifest.js';
import {ResolveRecipe} from '../../strategies/resolve-recipe.js';
import {StrategyTestHelper} from './strategy-test-helper.js';

let {createTestArc, onlyResult, theResults} = StrategyTestHelper;

describe('resolve recipe', function() {
  it('does not resolve a mapping of a handle with an invalid type', async () => {
    let manifest = await Manifest.parse(`
      schema Car
        Number doors
      schema Tesla extends Car
        Boolean bioweaponDefenceMode

      particle P in 'p.js'
        in Tesla param

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
        out Tesla param

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
        in Car param

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
        in Tesla param

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

  it('maps slots by tags', async () => {
    let manifest = (await Manifest.parse(`
      particle A in 'A.js'
        consume master #parent

      recipe
        slot 'id0' #parent as s0
        A
    `));
    let [recipe] = manifest.recipes;
    let arc = createTestArc('test-plan-arc', manifest, 'dom');
    assert.isTrue(recipe.normalize());


    recipe = await onlyResult(arc, ResolveRecipe, recipe);
    assert.isTrue(recipe.isResolved());
  });

  it('map slots by slot connection tags', async () => {
    let manifest = (await Manifest.parse(`
      particle A in 'A.js'
        consume master #root
          provide detail #info #detail
      particle B in 'B.js'
        consume info
      recipe
        A
        B
          consume info #detail
    `));
    let arc = StrategyTestHelper.createTestArc('test-plan-arc', manifest, 'dom');

    let strategy = new ResolveRecipe(arc);
    let results = await strategy.generate({generated: [{result: manifest.recipes[0], score: 1}]});
    assert.equal(results.length, 1);

    let plan = results[0].result;
    assert.equal(plan.slots.length, 2);
    plan.normalize();
    assert.isTrue(plan.isResolved());
  });
});
