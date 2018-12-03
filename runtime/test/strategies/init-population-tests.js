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

import {Arc} from '../../ts-build/arc.js';
import {Manifest} from '../../ts-build/manifest.js';
import {InitPopulation} from '../../ts-build/strategies/init-population.js';
import {StrategyTestHelper} from './strategy-test-helper.js';
import {StubLoader} from '../../testing/stub-loader.js';
import {assert} from '../chai-web.js';

describe('InitPopulation', async () => {
  it('penalizes resolution of particles that already exist in the arc', async () => {
    const manifest = await Manifest.parse(`
      schema Product

      particle A in 'A.js'
        in Product product

      recipe
        create as handle1
        A
          product <- handle1`);
    const loader = new StubLoader({
      'A.js': 'defineParticle(({Particle}) => class extends Particle {})'
    });
    const recipe = manifest.recipes[0];
    assert(recipe.normalize());
    const arc = new Arc({id: 'test-plan-arc', context: manifest, loader, fileName: ''});

    async function scoreOfInitPopulationOutput() {
      const results = await new InitPopulation(arc, {contextual: false}).generate({generation: 0});
      assert.lengthOf(results, 1);
      return results[0].score;
    }

    assert.equal(await scoreOfInitPopulationOutput(), 1);
    await arc.instantiate(recipe);
    assert.equal(await scoreOfInitPopulationOutput(), 0);
  });

  it('reads from RecipeIndex', async () => {
    const manifest = await Manifest.parse(`
      particle A
      recipe
        A`);

    const [recipe] = manifest.recipes;
    assert(recipe.normalize());

    const arc = new Arc({
      id: 'test-plan-arc',
      context: new Manifest({id: 'test'}),
      recipeIndex: {
        recipes: manifest.recipes
      }
    });

    const results = await new InitPopulation(arc, {contextual: false}).generate({generation: 0});
    assert.lengthOf(results, 1);
    assert.equal(results[0].result.toString(), recipe.toString());
  });

  it('contextual population has recipes matching arc handles and slots', async () => {
    const manifest = await Manifest.parse(`
      schema Burrito

      // Binds to handle Burrito
      particle EatBurrito
        in Burrito burrito
      recipe EatBurrito
        EatBurrito

      // Binds to slot tortilla
      particle FillsTortilla
        consume tortilla
      recipe FillsTortilla
        FillsTortilla

      // Provides handle Burrito and slot tortilla
      particle BurritoRestaurant
        out Burrito burrito
        consume root
          provide tortilla
      recipe BurritoRestaurant
        create as burrito
        BurritoRestaurant
          burrito -> burrito

      schema Burger

      // Binds to handle Burger
      particle EatBurger
        in Burger burger
      recipe EatBurger
        EatBurger

      // Binds to slot bun
      particle FillsBun
        consume bun
      recipe FillsBun
        FillsBun

      // Provides handle Burger and slot bun
      particle BurgerRestaurant
        out Burger burger
        consume root
          provide bun
      recipe BurgerRestaurant
        create as burger
        BurgerRestaurant
          burger -> burger
    `);

    const arc = StrategyTestHelper.createTestArc('test-plan-arc', manifest, 'dom');

    async function openRestaurantWith(foodType) {
      const restaurant = manifest.recipes.find(recipe => recipe.name === `${foodType}Restaurant`);
      const FoodEntity = manifest.findSchemaByName(foodType).entityClass();
      const store = await arc.createStore(FoodEntity.type, undefined, `test:${foodType}`);
      restaurant.handles[0].mapToStorage(store);
      restaurant.normalize();
      restaurant.mergeInto(arc.activeRecipe);
    }

    let results = await new InitPopulation(arc, {contextual: true}).generate({generation: 0});
    assert.lengthOf(results, 0, 'Initially nothing is available to eat');

    await openRestaurantWith('Burrito');
    results = await new InitPopulation(arc, {contextual: true}).generate({generation: 0});
    assert.deepEqual(results.map(r => r.result.name), [
      'FillsTortilla',
      'EatBurrito'
    ], 'After a Burrito restaurant opened, tortilla wrapped goodness can be consumed');

    await openRestaurantWith('Burger');
    results = await new InitPopulation(arc, {contextual: true}).generate({generation: 0});
    assert.lengthOf(results, 4, );
    assert.deepEqual(results.map(r => r.result.name), [
      'FillsTortilla',
      'FillsBun',
      'EatBurrito',
      'EatBurger'
    ], 'Eventually both a burrito and a burger can be enjoyed');

    results = await new InitPopulation(arc, {contextual: true}).generate({generation: 1});
    assert.lengthOf(results, 0, 'Food is only served once');
  });
});
