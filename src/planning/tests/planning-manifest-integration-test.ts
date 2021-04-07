/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {assert} from '../../platform/chai-web.js';
import {manifestTestSetup} from '../../runtime/testing/manifest-integration-test-setup.js';
import {Speculator} from '../speculator.js';

describe('planning manifest integration', () => {
  it('can produce a recipe that can be speculated', async () => {
    const {runtime, arc, recipe} = await manifestTestSetup();
    const hash = ((hash) => hash.substring(hash.length - 4))(await recipe.digest());
    const {speculativeArc, relevance} = await new Speculator(runtime).speculate(arc, recipe, hash);
    assert.strictEqual(relevance.calcRelevanceScore(), 1);
    assert.lengthOf(speculativeArc.recipeDeltas, 1);
  });
});
