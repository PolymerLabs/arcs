/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {assert} from './chai-web.js';
import {Arc} from '../arc.js';
import {Loader} from '../loader.js';
import {Manifest} from '../manifest.js';
import {handleFor} from '../handle.js';
import {Speculator} from '../speculator.js';
import {StorageProxy} from '../storage-proxy.js';

async function setup() {
  const registry = {};
  const loader = new Loader();
  const manifest = await Manifest.load('./src/runtime/test/artifacts/test.manifest', loader, registry);
  assert(manifest);
  const arc = new Arc({id: 'test', context: manifest, loader});
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
    let store;
    [store] = arc.findStoresByType(type);
    assert(store);

    // TODO(lindner): mismatched type..
    const proxy = store as StorageProxy;
    
    const handle = handleFor(proxy);
    // TODO: This should not be necessary.
    type.maybeEnsureResolved();
    const result = await handle.get();
    assert.equal(result.value, 'Hello, world!');
  });

  it('can produce a recipe that can be speculated', async () => {
    const {arc, recipe} = await setup();
    const hash = ((hash) => hash.substring(hash.length - 4))(await recipe.digest());
    const suggestion = await new Speculator().speculate(arc, recipe, hash);
    assert.equal(suggestion.rank, 1);
  });
});
