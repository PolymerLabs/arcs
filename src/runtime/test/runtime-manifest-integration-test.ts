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
import {Arc} from '../arc.js';
import {handleFor} from '../handle.js';
import {Loader} from '../loader.js';
import {Manifest} from '../manifest.js';
import {StorageProxy} from '../storage-proxy.js';
import {manifestTestSetup} from '../testing/manifest-integration-test-setup.js';


describe('runtime manifest integration', () => {
  it('can produce a recipe that can be instantiated in an arc', async () => {
    const {arc, recipe} = await manifestTestSetup();
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
});
