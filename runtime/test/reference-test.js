/**
 * @license
 * Copyright (c) 2018 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {assert} from './chai-web.js';
import {Manifest} from '../manifest.js';

describe('references', function() {
  it('can parse & validate a recipe containing references', async () => {
    let manifest = await Manifest.parse(`
        schema Result
          Text value  

        particle Referencer in 'referencer.js'
          in Result in
          out Reference<Result> out

        particle Dereferencer in 'dereferencer.js'
          in Reference<Result> in
          out Result out
        
        recipe
          create 'input:1' as handle0
          create 'reference:1' as handle1
          create 'output:1' as handle2
          Referencer
            in <- handle0
            out -> handle1
          Dereferencer
            in <- handle1
            out -> handle2
    `);
    let recipe = manifest.recipes[0];
    assert.isTrue(recipe.normalize());
    assert.isTrue(recipe.isResolved());
  });
});
