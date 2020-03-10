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
import {Manifest} from '../../../runtime/manifest.js';
import {Loader} from '../../../platform/loader.js';
import {InitPopulation} from '../../strategies/init-population.js';

import {StrategyTestHelper} from '../../testing/strategy-test-helper.js';
import {ArcId} from '../../../runtime/id.js';

import {Entity} from '../../../runtime/entity.js';
import {SingletonType} from '../../../runtime/type.js';

describe('InitPopulation', () => {
  it('penalizes resolution of particles that already exist in the arc', async () => {
    const manifest = await Manifest.parse(`
      schema Product

      particle A in 'A.js'
        product: reads Product

      recipe
        handle1: create *
        A
          product: reads handle1`);
    const loader = new Loader(null, {
      'A.js': 'defineParticle(({Particle}) => class extends Particle {})'
    });
    const recipe = manifest.recipes[0];
    assert(recipe.normalize());
    const arc = new Arc({id: ArcId.newForTest('test-plan-arc'), context: manifest, loader});

    async function scoreOfInitPopulationOutput() {
      const results = await new InitPopulation(arc, StrategyTestHelper.createTestStrategyArgs(
          arc, {contextual: false})).generate({generation: 0});
      assert.lengthOf(results, 1);
      return results[0].score;
    }

    assert.strictEqual(await scoreOfInitPopulationOutput(), 1);
    await arc.instantiate(recipe);
    assert.strictEqual(await scoreOfInitPopulationOutput(), 0);
  });

  it('reads from RecipeIndex', async () => {
    const manifest = await Manifest.parse(`
      particle A
      recipe
        A`);

    const [recipe] = manifest.recipes;
    assert(recipe.normalize());

    const loader = new Loader(null, {
      'A.js': 'defineParticle(({Particle}) => class extends Particle {})'
    });
    const arc = new Arc({
      id: ArcId.newForTest('test-plan-arc'),
      context: new Manifest({id: ArcId.newForTest('test')}),
      loader
    });

    const results = await new InitPopulation(arc, {contextual: false,
        recipeIndex: {recipes: manifest.recipes}}).generate({generation: 0});
    assert.lengthOf(results, 1);
    assert.strictEqual(results[0].result.toString(), recipe.toString());
  });

  it('contextual population has recipes matching arc handles and slots', async () => {
    const manifest = await Manifest.parse(`
      schema Burrito

      // Binds to handle Burrito
      particle EatBurrito
        burrito: reads Burrito
      recipe EatBurrito
        EatBurrito

      // Binds to slot tortilla
      particle FillsTortilla
        tortilla: consumes Slot
      recipe FillsTortilla
        FillsTortilla

      // Provides handle Burrito and slot tortilla
      particle BurritoRestaurant
        burrito: writes Burrito
        root: consumes Slot
          tortilla: provides? Slot
      recipe BurritoRestaurant
        burrito: create *
        BurritoRestaurant
          burrito: writes burrito

      schema Burger

      // Binds to handle Burger
      particle EatBurger
        burger: reads Burger
      recipe EatBurger
        EatBurger

      // Binds to slot bun
      particle FillsBun
        bun: consumes Slot
      recipe FillsBun
        FillsBun

      // Provides handle Burger and slot bun
      particle BurgerRestaurant
        burger: writes Burger
        root: consumes Slot
          bun: provides? Slot
      recipe BurgerRestaurant
        burger: create *
        BurgerRestaurant
          burger: writes burger
    `);

    const arc = StrategyTestHelper.createTestArc(manifest);

    async function openRestaurantWith(foodType) {
      const restaurant = manifest.recipes.find(recipe => recipe.name === `${foodType}Restaurant`);
      const foodEntity = Entity.createEntityClass(manifest.findSchemaByName(foodType), null);
      const store = await arc.createStore(new SingletonType(foodEntity.type), undefined, `test:${foodType}`);
      restaurant.handles[0].mapToStorage(store);
      restaurant.normalize();
      restaurant.mergeInto(arc.activeRecipe);
    }

    let results = await new InitPopulation(arc, StrategyTestHelper.createTestStrategyArgs(
        arc, {contextual: true})).generate({generation: 0});
    assert.lengthOf(results, 0, 'Initially nothing is available to eat');

    await openRestaurantWith('Burrito');
    results = await new InitPopulation(arc, StrategyTestHelper.createTestStrategyArgs(
        arc, {contextual: true})).generate({generation: 0});
    assert.deepEqual(results.map(r => r.result.name), [
      'FillsTortilla',
      'EatBurrito'
    ], 'After a Burrito restaurant opened, tortilla wrapped goodness can be consumed');

    await openRestaurantWith('Burger');
    results = await new InitPopulation(arc, StrategyTestHelper.createTestStrategyArgs(
        arc, {contextual: true})).generate({generation: 0});
    assert.lengthOf(results, 4, );
    assert.deepEqual(results.map(r => r.result.name), [
      'FillsTortilla',
      'FillsBun',
      'EatBurrito',
      'EatBurger'
    ], 'Eventually both a burrito and a burger can be enjoyed');

    results = await new InitPopulation(arc, StrategyTestHelper.createTestStrategyArgs(
        arc, {contextual: true})).generate({generation: 1});
    assert.lengthOf(results, 0, 'Food is only served once');
  });
});
