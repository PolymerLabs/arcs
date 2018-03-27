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
import MatchRecipeByVerb from '../../strategies/match-recipe-by-verb.js';
import ConvertConstraintsToConnections from '../../strategies/convert-constraints-to-connections.js';
import {assert} from '../chai-web.js';

describe('MatchRecipeByVerb', function() {
  it('removes a particle and adds a recipe', async () => {
    let manifest = await Manifest.parse(`
      recipe
        particle can jump

      schema Feet
      schema Energy

      particle JumpingBoots in 'A.js'
        JumpingBoots(in Feet f, in Energy e)
      particle FootFactory in 'B.js'
        FootFactory(out Feet f)
      particle NuclearReactor in 'C.js'
        NuclearReactor(out Energy e)

      recipe jump
        JumpingBoots.f <- FootFactory.f
        JumpingBoots.e <- NuclearReactor.e
    `);

    let arc = StrategyTestHelper.createTestArc('test-plan-arc', manifest, 'dom');
    let inputParams = {generated: [{result: manifest.recipes[0], score: 1}]};
    let mrv = new MatchRecipeByVerb(arc);
    let results = await mrv.generate(inputParams);
    assert.equal(results.length, 1);
    assert.equal(results[0].result.particles.length, 0);
    assert.deepEqual(results[0].result.toString(), 'recipe\n  JumpingBoots.e -> NuclearReactor.e\n  JumpingBoots.f -> FootFactory.f');
  });
  it('plays nicely with constraints', async () => {
    let manifest = await Manifest.parse(`
      schema S
      particle P in 'A.js'
        P(out S p)
      particle Q in 'B.js'
        Q(in S q)

      recipe
        P.p -> Q.q
        particle can a

      recipe a
        P
    `);

    let arc = StrategyTestHelper.createTestArc('test-plan-arc', manifest, 'dom');
    let inputParams = {generated: [{result: manifest.recipes[0], score: 1}]};
    let mrv = new MatchRecipeByVerb(arc);
    let results = await mrv.generate(inputParams);
    assert.equal(results.length, 1);
    let cctc = new ConvertConstraintsToConnections(arc);
    results = await cctc.generate({generated: results});
    assert.equal(results.length, 1);
    assert.deepEqual(results[0].result.toString(),
`recipe
  create as view0 // S
  P as particle0
    p -> view0
  Q as particle1
    q <- view0`);
  });
});
