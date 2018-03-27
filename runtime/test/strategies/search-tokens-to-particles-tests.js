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

import Manifest from '../../manifest.js';
import StrategyTestHelper from './strategy-test-helper.js';
import SearchTokensToParticles from '../../strategies/search-tokens-to-particles.js';
import {assert} from '../chai-web.js';

describe('SearchTokensToParticles', function() {
  it('particles by verb strategy', async () => {
    let manifest = (await Manifest.parse(`
      particle SimpleJumper in 'A.js'
        jump()
      particle StarJumper in 'AA.js'
        jump()
      particle GalaxyFlyer in 'AA.js'
        fly()
      particle Rester in 'AA.js'
        rest()

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
});
