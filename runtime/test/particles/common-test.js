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

import {assert} from '../chai-web.js';
import TestHelper from '../test-helper.js';

describe('common particles test', function() {
  it('copy handle test', async () => {
    let helper = await TestHelper.loadManifestAndPlan(
        './runtime/test/particles/artifacts/copy-collection-test.recipes',
        {expectedNumPlans: 1, expectedSuggestions: ['Copy all things!']});
    assert.equal(0, helper.arc._handles.length);

    await helper.acceptSuggestion({particles: ['CopyCollection', 'CopyCollection']});

    // Copied 2 and 3 entities from two collections.
    assert.equal(5, helper.arc._handles[0]._items.size);
  });
});
