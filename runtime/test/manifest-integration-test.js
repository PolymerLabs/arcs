/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

'use strict';

import {assert} from './chai-web.js';
import {Arc} from '../ts-build/arc.js';
import {Loader} from '../ts-build/loader.js';
import {Manifest} from '../ts-build/manifest.js';
import {handleFor} from '../ts-build/handle.js';
import {Speculator} from '../ts-build/speculator.js';

async function setup() {
  const registry = {};
  const loader = new Loader();
  const manifest = await Manifest.load('./runtime/test/artifacts/test.manifest', loader, registry);
  assert(manifest);
  const arc = new Arc({id: 'test'});
  const recipe = manifest.recipes[0];
  assert(recipe.normalize());
  assert(recipe.isResolved());
  return {arc, recipe};
}

describe('manifest integration', () => {
  it('can produce a recipe that can be instantiated in an arc', async () => {
    const {arc, recipe} = await setup();
    await arc.instantiate(recipe);
    await arc.idle;
    const type = recipe.handles[0].type;
    const [store] = arc.findStoresByType(type);
    assert(store);
    const handle = handleFor(store);
    // TODO: This should not be necessary.
    type.maybeEnsureResolved();
    const result = await handle.get();
    assert.equal(result.value, 'Hello, world!');
  });
  it('can produce a recipe that can be speculated', async () => {
    const {arc, recipe} = await setup();
    const relevance = await new Speculator().speculate(arc, recipe);
    assert.equal(relevance.calcRelevanceScore(), 1);
  });
});
