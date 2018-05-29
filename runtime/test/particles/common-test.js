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
import {TestHelper} from '../../testing/test-helper.js';
import {Manifest} from '../../manifest.js';

describe('common particles test', function() {
  it('resolves after cloning', async () => {
    let manifest = await Manifest.parse(`
  schema Thing
    Text name
    Text description
    URL image
    URL url
    Text identifier

  particle CopyCollection in 'source/CopyCollection.js'
    in [~a] input
    out [~a] output

  recipe
    map 'bigthings' as bigthings
    map 'smallthings' as smallthings
    create as things
    CopyCollection
      input <- bigthings
      output -> things
    CopyCollection
      input <- smallthings
      output -> things
  
  resource BigThings
    start
    [
      {"name": "house"},
      {"name": "car"}
    ]
  store Store0 of [Thing] 'bigthings' in BigThings
  
  resource SmallThings
    start
    [
      {"name": "pen"},
      {"name": "spoon"},
      {"name": "ball"}
    ]
  store Store1 of [Thing] 'smallthings' in SmallThings
    `);
  
    let recipe = manifest.recipes[0];
    let newRecipe = recipe.clone();
    recipe.normalize();
    assert(recipe.isResolved());
    newRecipe.normalize();
    assert(newRecipe.isResolved());
  });


  it('copy handle test', async () => {
    let helper = await TestHelper.loadManifestAndPlan(
        './runtime/test/particles/artifacts/copy-collection-test.recipes',
        {expectedNumPlans: 1, expectedSuggestions: ['Copy all things!']});
    assert.equal(0, helper.arc._stores.length);

    await helper.acceptSuggestion({particles: ['CopyCollection', 'CopyCollection']});

    // Copied 2 and 3 entities from two collections.
    assert.equal(5, helper.arc._stores[0]._items.size);
  });
});
