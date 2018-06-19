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
import {GroupHandleConnections} from '../../strategies/group-handle-connections.js';
import {SearchTokensToParticles} from '../../strategies/search-tokens-to-particles.js';
import {CombinedStrategy} from '../../strategies/combined-strategy.js';
import {assert} from '../chai-web.js';

describe('CombinedStrategy', function() {
  it('combined strategy with search tokens and group handle connections', async () => {
    let manifest = (await Manifest.parse(`
      schema Energy
      schema Height
      particle Energizer &prepare in 'A.js'
        out Energy energy
      particle Jumper &jump in 'AA.js'
        in Energy energy
        out Height height

      recipe
        search \`prepare and jump\`
    `));
    manifest.recipes[0].normalize();
    let inputParams = {generated: [{result: manifest.recipes[0], score: 1}], terminal: []};
    let arc = StrategyTestHelper.createTestArc('test-plan-arc', manifest, 'dom');
    let strategy = new CombinedStrategy([
      new SearchTokensToParticles(arc),
      new GroupHandleConnections(arc),
    ]);

    let results = await strategy.generate(inputParams);
    assert.lengthOf(results, 1);
    let recipe = results[0].result;
    assert.lengthOf(recipe.particles, 2);
    assert.lengthOf(recipe.handles, 1);
    assert.lengthOf(recipe.handles[0].connections, 2);
  });
});
