/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

let Manifest = require('../manifest.js');
let RecipeUtil = require('../recipe/recipe-util.js');
let assert = require('assert');

describe('recipe-util', function() {
  it('can produce a shape match to a simple recipe', async () => {
    let manifest = await Manifest.parse(`
      recipe Recipe
        map as v1
        A
          a -> v1
        B
          b -> v1`);
    let recipe = manifest.recipes[0];
    let shape =  RecipeUtil.makeShape(['A', 'B'], ['v'],
      {'A': {'a': 'v'}, 'B': {'b': 'v'}});
    let results = RecipeUtil.find(recipe, shape);
    assert(results.length == 1);
    assert(results[0].score == 0);
    assert(results[0].match.A.name == 'A');
    assert(results[0].match.B.name == 'B');
    assert(results[0].match.v.localName == 'v1');
  });

  it('can produce multiple partial shape matches to a simple recipe', async () => {
    let manifest = await Manifest.parse(`
      recipe Recipe
        map as v1
        map as v2
        A
          a -> v1
        B
          b -> v1
        A
          a -> v2
        C
          c -> v2`);
    let recipe = manifest.recipes[0];
    let shape =  RecipeUtil.makeShape(['A', 'B', 'C'], ['v'],
      {'A': {'a': 'v'}, 'B': {'b': 'v'}, 'C': {'c': 'v'}});
    let results = RecipeUtil.find(recipe, shape);
    assert(results.length == 2);
    assert(results[0].score == -1);
    assert(results[0].match.A.name == 'A');
    assert(results[0].match.B.name == 'B');
    assert(results[0].match.C.name == 'C');
    assert(results[0].match.v.localName == 'v1');
    assert(results[1].score == -1);
    assert(results[1].match.A.name == 'A');
    assert(results[1].match.B.name == 'B');
    assert(results[1].match.C.name == 'C');
    assert(results[1].match.v.localName == 'v2');
  });
});
