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

import {Manifest} from '../../manifest.js';
import {StrategyTestHelper} from './strategy-test-helper.js';
import {CoalesceRecipes} from '../../strategies/coalesce-recipes.js';
import {assert} from '../chai-web.js';

describe('CoalesceRecipes', function() {
  it('coalesces required slots', async () => {
    let manifest = (await Manifest.parse(`
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
    `));

    let recipes = manifest.recipes;
    recipes.forEach(recipe => {
      recipe.normalize();
      assert.isFalse(recipe.isResolved());
    });
    let arc = StrategyTestHelper.createTestArc('test-plan-arc', manifest, 'dom');
    let inputParams = {generated: [], terminal: [{result: recipes[0], score: 1}, {result: recipes[1], score: 1}]};
    let strategy = new CoalesceRecipes(arc);
    let results = await strategy.generate(inputParams);

    assert.equal(1, results.length);
    let recipe = results[0].result;
    assert.isTrue(recipe.isResolved());
    assert.lengthOf(recipe.particles, 2);
    assert.lengthOf(recipe.slots, 2);
  });

  it('coalesces required slots with handles', async () => {
    let manifest = (await Manifest.parse(`
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
    `));

    let recipes = manifest.recipes;
    recipes.forEach(recipe => {
      recipe.normalize();
      assert.isFalse(recipe.isResolved());
    });
    let arc = StrategyTestHelper.createTestArc('test-plan-arc', manifest, 'dom');
    let inputParams = {generated: [], terminal: [{result: recipes[0], score: 1}, {result: recipes[1], score: 1}]};
    let strategy = new CoalesceRecipes(arc);
    let results = await strategy.generate(inputParams);

    assert.equal(1, results.length);
    let recipe = results[0].result;
    recipe.normalize();
    assert.isTrue(recipe.isResolved());
    assert.lengthOf(recipe.particles, 3);
    assert.lengthOf(recipe.slots, 2);
  });
});
