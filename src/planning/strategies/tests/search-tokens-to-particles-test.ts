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
import {SearchTokensToParticles} from '../../strategies/search-tokens-to-particles.js';

import {StrategyTestHelper} from '../../testing/strategy-test-helper.js';

describe('SearchTokensToParticles', () => {
  it('matches particles by verb strategy', async () => {
    const manifest = (await Manifest.parse(`
      particle SimpleJumper &jump in 'A.js'
      particle StarJumper &jump in 'AA.js'
      particle GalaxyFlyer &fly in 'AA.js'
      particle Rester &rest in 'AA.js'

      recipe
        search \`jump or fly or run and rester\`
    `));
    const arc = await StrategyTestHelper.createTestArc(manifest);
    const recipe = manifest.recipes[0];
    assert(recipe.normalize());
    assert(!recipe.isResolved());
    const inputParams = {generated: [], terminal: [{result: recipe, score: 1}]};
    const stp = new SearchTokensToParticles(arc, StrategyTestHelper.createTestStrategyArgs(arc));
    const results = await stp.generate(inputParams);
    assert.lengthOf(results, 2);
    assert.deepEqual([['GalaxyFlyer', 'Rester', 'SimpleJumper'],
                      ['GalaxyFlyer', 'Rester', 'StarJumper']], results.map(r => r.result.particles.map(p => p.name).sort()));
    assert.deepEqual(['fly', 'jump', 'rester'], results[0].result.search.resolvedTokens);
    assert.deepEqual(['and', 'or', 'or', 'run'], results[0].result.search.unresolvedTokens);
  });

  it('matches particles by split verb', async () => {
    const manifest = (await Manifest.parse(`
      particle GalaxyRunner &run in 'AA.js'
      particle GalaxyFlyer &fly in 'AA.js'

      recipe
        search \`galaxy and runner\`

      recipe
        search \`galaxy flyer\`
    `));
    const arc = await StrategyTestHelper.createTestArc(manifest);
    const recipes = manifest.recipes;
    recipes.forEach(recipe => {
      assert(recipe.normalize());
      assert(!recipe.isResolved());
    });
    const inputParams = {generated: [], terminal: recipes.map(recipe => ({result: recipe, score: 1}))};
    const stp = new SearchTokensToParticles(arc, StrategyTestHelper.createTestStrategyArgs(arc));
    const results = await stp.generate(inputParams);
    assert.lengthOf(results, 1);
    const result = results[0].result;
    assert.lengthOf(result.particles, 1);
    assert.strictEqual('GalaxyFlyer', result.particles[0].name);
    assert.deepEqual(['flyer', 'galaxy'], result.search.resolvedTokens);
    assert.isEmpty(result.search.unresolvedTokens);
  });

  it('matches recipes by split verb', async () => {
    const manifest = (await Manifest.parse(`
      particle GalaxyRunner &run in 'AA.js'

      recipe &galaxyRunning
        GalaxyRunner

      recipe
        search \`galaxy running and more\`
    `));
    const arc = await StrategyTestHelper.createTestArc(manifest);
    const recipe = manifest.recipes[1];
    assert(recipe.normalize());
    assert(!recipe.isResolved());
    const inputParams = {generated: [], terminal: [{result: recipe, score: 1}]};
    const stp = new SearchTokensToParticles(arc, StrategyTestHelper.createTestStrategyArgs(arc));
    const results = await stp.generate(inputParams);
    assert.lengthOf(results, 1);
    const result = results[0].result;
    assert.lengthOf(result.particles, 1);
    assert.strictEqual('GalaxyRunner', result.particles[0].name);
    assert.deepEqual(['galaxy', 'running'], result.search.resolvedTokens);
    assert.deepEqual(['and', 'more'], result.search.unresolvedTokens);
  });

  it('matches recipes by verb strategy', async () => {
    const manifest = (await Manifest.parse(`
      particle SimpleJumper &jump in 'A.js'
      particle FlightPreparation in 'AA.js'
      particle GalaxyFlyer in 'AA.js'
      recipe Flight &fly
        FlightPreparation
        GalaxyFlyer

      recipe
        search \`jump or fly\`
      recipe
        search \`jump and flight\`
    `));
    const arc = await StrategyTestHelper.createTestArc(manifest);
    const recipes = manifest.recipes.slice(1);
    recipes.forEach((recipe, index) => {
      assert(recipe.normalize());
      assert.isFalse(recipe.isResolved());
    });
    const inputParams = {generated: [], terminal: [{result: recipes[0], score: 1}, {result: recipes[1], score: 1}]};
    const stp = new SearchTokensToParticles(arc, StrategyTestHelper.createTestStrategyArgs(arc));
    const results = await stp.generate(inputParams);
    assert.lengthOf(results, 2);
    let result = results[0].result;
    assert.deepEqual(['FlightPreparation', 'GalaxyFlyer', 'SimpleJumper'], result.particles.map(p => p.name).sort());
    assert.deepEqual(['fly', 'jump'], result.search.resolvedTokens);
    assert.deepEqual(['or'], result.search.unresolvedTokens);
    result = results[1].result;
    assert.deepEqual(['FlightPreparation', 'GalaxyFlyer', 'SimpleJumper'], result.particles.map(p => p.name).sort());
    assert.deepEqual(['flight', 'jump'], result.search.resolvedTokens);
    assert.deepEqual(['and'], result.search.unresolvedTokens);
  });
});
