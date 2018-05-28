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
import {FallbackFate} from '../../strategies/fallback-fate.js';
import {assert} from '../chai-web.js';

describe('FallbackFate', function() {
  it('fallback for search based recipe', async () => {
    let manifest = (await Manifest.parse(`
      schema Thing
      particle DoSomething in 'AA.js'
        in Thing inthing
        out Thing outthing

      recipe
        search \`DoSomething DoSomethingElse\`
        use as handle0
        use as handle1
        DoSomething as particle0
          inthing <- handle0
          outthing -> handle1
    `));
    let recipe = manifest.recipes[0];
    recipe.handles.forEach(v => v._originalFate = '?');
    assert(recipe.normalize());
    let arc = StrategyTestHelper.createTestArc('test-plan-arc', manifest, 'dom');
    let inputParams = {generated: [{result: manifest.recipes[0], score: 1}], terminal: []};
    let strategy = new FallbackFate(arc);

    // no resolved search tokens.
    let results = await strategy.generate(inputParams);
    assert.equal(results.length, 0);

    // Resolved a search token and rerun strategy.
    recipe.search.resolveToken('DoSomething');
    results = (await strategy.generate(inputParams));
    assert.equal(results.length, 1);
    let plan = results[0].result;
    assert.equal(plan.handles.length, 2);
    assert.equal('map', plan.handles[0].fate);
    assert.equal('copy', plan.handles[1].fate);
  });

  it('ignore non-search unresolved recipe', async () => {
    // Same as above, but the recipe doesn't originate from user search query.
    let manifest = (await Manifest.parse(`
      schema Thing
      particle DoSomething in 'AA.js'
        in Thing inthing
        out Thing outthing

      recipe
        use as handle0
        use as handle1
        DoSomething as particle0
          inthing <- handle0
          outthing -> handle1
    `));
    let recipe = manifest.recipes[0];
    recipe.handles.forEach(v => v._originalFate = '?');
    assert(recipe.normalize());
    let arc = StrategyTestHelper.createTestArc('test-plan-arc', manifest, 'dom');
    let inputParams = {generated: [{result: manifest.recipes[0], score: 1}], terminal: []};

    let strategy = new FallbackFate(arc);
    let results = await strategy.generate(inputParams);
    assert.equal(results.length, 0);
  });
});
