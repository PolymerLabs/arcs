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
import {Arc} from '../../runtime/arc.js';
import {Loader} from '../../platform/loader.js';
import {Manifest} from '../../runtime/manifest.js';
import {Speculator} from '../speculator.js';
import {Id, ArcId} from '../../runtime/id.js';
import {Runtime} from '../../runtime/runtime.js';

describe('speculator', () => {
  it('can speculatively produce a relevance', async () => {
    const loader = new Loader();
    const runtime = new Runtime({loader, context: new Manifest({id: ArcId.newForTest('test')})});
    const arc = runtime.getArcById(runtime.allocator.newArc({arcName: 'test'}));
    const manifest = await Manifest.load('./src/runtime/tests/artifacts/test.manifest', loader);
    const recipe = manifest.recipes[0];
    assert(recipe.normalize());
    const hash = ((hash) => hash.substring(hash.length - 4))(await recipe.digest());
    const speculator = new Speculator(runtime);
    const {speculativeArc, relevance} = await speculator.speculate(arc, recipe, hash);
    assert.strictEqual(relevance.calcRelevanceScore(), 1);
    assert.lengthOf(speculativeArc.recipeDeltas, 1);
  });
});
