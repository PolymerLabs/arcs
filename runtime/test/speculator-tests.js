/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {Speculator} from '../ts-build/speculator.js';
import {Arc} from '../ts-build/arc.js';
import {assert} from './chai-web.js';
import {Loader} from '../ts-build/loader.js';
import {Manifest} from '../ts-build/manifest.js';

describe('speculator', function() {
  it('can speculatively produce a relevance', async () => {
    const loader = new Loader();
    const arc = new Arc({id: 'test'});
    const manifest = await Manifest.load('./runtime/test/artifacts/test.manifest', loader);
    const recipe = manifest.recipes[0];
    assert(recipe.normalize());
    const hash = ((hash) => hash.substring(hash.length - 4))(await recipe.digest());
    const speculator = new Speculator();
    const suggestion = await speculator.speculate(arc, recipe, hash);
    assert.equal(suggestion.rank, 1);
  });
});
