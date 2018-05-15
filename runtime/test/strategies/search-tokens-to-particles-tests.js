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
import {SearchTokensToParticles} from '../../strategies/search-tokens-to-particles.js';
import {assert} from '../chai-web.js';

describe('SearchTokensToParticles', function() {
  it('particles by verb strategy', async () => {
    let manifest = (await Manifest.parse(`
      particle SimpleJumper &jump in 'A.js'
      particle StarJumper &jump in 'AA.js'
      particle GalaxyFlyer &fly in 'AA.js'
      particle Rester &rest in 'AA.js'

      recipe
        search \`jump or fly or run and Rester\`
    `));
    let arc = StrategyTestHelper.createTestArc('test-plan-arc', manifest, 'dom');
    let recipe = manifest.recipes[0];
    assert(recipe.normalize());
    assert(!recipe.isResolved());
    let inputParams = {generated: [], terminal: [{result: recipe, score: 1}]};
    let stp = new SearchTokensToParticles(arc);
    let results = await stp.generate(inputParams);
    assert.equal(results.length, 2);
    assert.deepEqual([['GalaxyFlyer', 'Rester', 'SimpleJumper'],
                      ['GalaxyFlyer', 'Rester', 'StarJumper']], results.map(r => r.result.particles.map(p => p.name).sort()));
    assert.deepEqual(['fly', 'jump', 'rester'], results[0].result.search.resolvedTokens);
    assert.deepEqual(['and', 'or', 'or', 'run'], results[0].result.search.unresolvedTokens);
  });

  it('recipes by verb strategy', async () => {
    let manifest = (await Manifest.parse(`
      particle SimpleJumper &jump in 'A.js'
      particle FlightPreparation in 'AA.js'
      particle GalaxyFlyer in 'AA.js'
      recipe Flight &fly
        FlightPreparation
        GalaxyFlyer

      recipe
        search \`jump or fly\`
      recipe
        search \`jump and Flight\`
    `));
    let arc = StrategyTestHelper.createTestArc('test-plan-arc', manifest, 'dom');
    let recipes = manifest.recipes.slice(1);
    recipes.forEach((recipe, index) => {
      assert(recipe.normalize());
      assert.isFalse(recipe.isResolved());
    });
    let inputParams = {generated: [], terminal: [{result: recipes[0], score: 1}, {result: recipes[1], score: 1}]};
    let stp = new SearchTokensToParticles(arc);
    let results = await stp.generate(inputParams);
    assert.equal(results.length, 2);
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
