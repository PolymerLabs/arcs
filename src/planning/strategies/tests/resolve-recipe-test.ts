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
import {ResolveRecipe} from '../../strategies/resolve-recipe.js';
import {StrategyTestHelper} from '../../testing/strategy-test-helper.js';
import {Entity} from '../../../runtime/entity.js';
import {SingletonType} from '../../../types/lib-types.js';
import {Runtime} from '../../../runtime/runtime.js';

const {createTestArc, onlyResult, theResults, noResult} = StrategyTestHelper;

describe('resolve recipe', () => {
  it('does not resolve a mapping of a handle with an invalid type', async () => {
    const runtime = new Runtime();
    const manifest = await runtime.parse(`
      schema Car
        doors: Number
      schema Tesla extends Car
        bioweaponDefenceMode: Boolean

      particle P in 'p.js'
        param: reads Tesla

      recipe
        h0: copy *
        P
          param: reads h0

      store TestStore of Car in EmptyListJson
      resource EmptyListJson
        start
        []
    `);

    const [recipe] = manifest.recipes;
    assert.isTrue(recipe.normalize());

    await noResult(await createTestArc(manifest), ResolveRecipe, recipe);
  });

  it('resolves a mapping of a handle with a less specific entity type', async () => {
    const runtime = new Runtime();
    const manifest = await runtime.parse(`
      schema Car
        doors: Number
      schema Tesla extends Car
        bioweaponDefenceMode: Boolean

      particle P in 'p.js'
        param: writes Tesla

      recipe
        h0: copy *
        P
          param: writes h0

      store TestStore of Car in EmptyListJson
      resource EmptyListJson
        start
        []
    `);

    let [recipe] = manifest.recipes;
    assert.isTrue(recipe.normalize());

    recipe = await onlyResult(await createTestArc(manifest), ResolveRecipe, recipe);
    assert.isTrue(recipe.isResolved());
  });

  it('resolves a mapping of a handle with a more specific entity type', async () => {
    const runtime = new Runtime();
    const manifest = await runtime.parse(`
      schema Car
        doors: Number
      schema Tesla extends Car
        bioweaponDefenceMode: Boolean

      particle P in 'p.js'
        param: reads Car

      recipe
        h0: copy *
        P
          param: reads h0

      store TestStore of Tesla in EmptyListJson
      resource EmptyListJson
        start
        []
    `);

    let [recipe] = manifest.recipes;
    assert.isTrue(recipe.normalize());

    recipe = await onlyResult(await createTestArc(manifest), ResolveRecipe, recipe);
    assert.isTrue(recipe.isResolved());
  });

  it('resolves a mapping of a handle with an equivalent entity type', async () => {
    const runtime = new Runtime();
    const manifest = await runtime.parse(`
      schema Car
        doors: Number
      schema Tesla extends Car
        bioweaponDefenceMode: Boolean

      particle P in 'p.js'
        param: reads Tesla

      recipe
        h0: copy *
        P
          param: reads h0

      store TestStore of Tesla in EmptyListJson
      resource EmptyListJson
        start
        []
    `);

    let [recipe] = manifest.recipes;
    assert.isTrue(recipe.normalize());

    recipe = await onlyResult(await createTestArc(manifest), ResolveRecipe, recipe);
    assert.isTrue(recipe.isResolved());
  });

  it('maps slots by tags', async () => {
    const runtime = new Runtime();
    const manifest = await runtime.parse(`
      particle A in 'A.js'
        master: consumes Slot #parent

      recipe
        s0: slot 'id0' #parent
        A
    `);
    let [recipe] = manifest.recipes;
    assert.isTrue(recipe.normalize());

    recipe = await onlyResult(await createTestArc(manifest), ResolveRecipe, recipe);
    assert.isTrue(recipe.isResolved());
  });

  it('map slots by slot connection tags', async () => {
    const runtime = new Runtime();
    const manifest = await runtime.parse(`
      particle A in 'A.js'
        master: consumes Slot #root
          detail: provides? Slot #info #detail
      particle B in 'B.js'
        info: consumes Slot
      recipe
        A
          master: consumes #root
        B
          info: consumes #detail
    `);

    const strategy = new ResolveRecipe(await createTestArc(manifest));
    const results = await strategy.generateFrom([{result: manifest.recipes[0], score: 1}]);
    assert.lengthOf(results, 1);

    const plan = results[0].result;
    assert.lengthOf(plan.slots, 2);
    plan.normalize();
    assert.isTrue(plan.isResolved());
  });

  it(`maps 'map' handles specified by id to storage`, async () => {
    const runtime = new Runtime();
    const context = await runtime.parse(`
      schema Car
        doors: Number

      store TestStore of Car 'batmobile' in EmptyListJson
      resource EmptyListJson
        start
        []
    `);

    // Separating context from the recipe as otherwise
    // manifest parser maps to storage all by itself itself.
    const recipe = (await runtime.parse(`
      schema Car
        doors: Number

      particle P in 'p.js'
        param: reads Car

      recipe
        h0: map 'batmobile'
        P
          param: reads h0
    `)).recipes[0];

    recipe.normalize();
    assert.isUndefined(recipe.handles[0].storageKey);

    const strategy = new ResolveRecipe(await createTestArc(context));
    const results = await strategy.generateFrom([{result: recipe, score: 1}]);
    assert.lengthOf(results, 1);

    const plan = results[0].result;
    plan.normalize();
    assert.isDefined(plan.handles[0].storageKey);
    assert.isTrue(plan.isResolved());
  });

  it(`maps 'use' handles specified by id to storage`, async () => {
    const runtime = new Runtime();
    const manifest = await runtime.parse(`
      schema Car
        doors: Number

      particle P in 'p.js'
        param: reads Car

      recipe
        h0: use 'batmobile'
        P
          param: reads h0
    `);

    const arc = await createTestArc(manifest);

    const car = Entity.createEntityClass(manifest.findSchemaByName('Car'), null);
    await arc.createStore(new SingletonType(car.type), /* name= */ null, 'batmobile');

    const recipe = manifest.recipes[0];

    recipe.normalize();
    assert.isUndefined(recipe.handles[0].storageKey);

    const strategy = new ResolveRecipe(arc);
    const results = await strategy.generateFrom([{result: recipe, score: 1}]);
    assert.lengthOf(results, 1);

    const plan = results[0].result;
    plan.normalize();
    assert.isDefined(plan.handles[0].storageKey);
    assert.isTrue(plan.isResolved());
  });
});
