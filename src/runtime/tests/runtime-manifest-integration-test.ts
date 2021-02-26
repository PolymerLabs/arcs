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
import {manifestTestSetup} from '../testing/manifest-integration-test-setup.js';
import {handleForStoreInfo, SingletonEntityType} from '../storage/storage.js';
import {StoreInfo} from '../storage/store-info.js';

describe('runtime manifest integration', () => {
  it('can produce a recipe that can be instantiated in an arc', async () => {
    const {runtime, arc, recipe} = await manifestTestSetup();
    await runtime.allocator.runPlanInArc(arc.id, recipe);
    await arc.idle;
    const type = recipe.handles[0].type;
    const storeInfo = arc.findStoresByType(type)[0] as StoreInfo<SingletonEntityType>;

    const handle = await handleForStoreInfo(storeInfo, arc);
    // TODO: This should not be necessary.
    type.maybeResolve();
    const result = await handle.fetch();
    assert.strictEqual(result['value'], 'Hello, world!');
  });
});
