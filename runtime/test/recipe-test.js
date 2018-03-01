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
import Manifest from '../manifest.js';
import Recipe from '../recipe/recipe.js';

describe('recipe', function() {
  it('normalize errors', async () => {
    let manifest = await Manifest.parse(`
        schema S1
        schema S2
        particle P1
          P1(in S1 s1, out S2 s2)
        recipe
          map as view1
          map 'h0' as view2
          map 'h0' as view3
          slot 's0' as slot0
          slot 's0' as slot1
          P1
            s1 = view1
            s2 -> view2
    `);
    let recipe = manifest.recipes[0];
    recipe.views[0]._mappedType = recipe.particles[0].connections['s2'].type;
    let options = {errors: new Map()};

    recipe.normalize(options);

    assert.equal(4, options.errors.size);
    recipe.views.forEach(handle => assert.isTrue(options.errors.has(handle)));
    options.errors.has(recipe.slots[1]);
  });
});
