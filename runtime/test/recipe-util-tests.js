/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {Manifest} from '../manifest.js';
import {RecipeUtil} from '../recipe/recipe-util.js';
import {assert} from './chai-web.js';

describe('recipe-util', function() {
  it('can produce a shape match to a simple recipe', async () => {
    let manifest = await Manifest.parse(`
      schema S
      particle A
        out S a
      particle B
        out S b

      recipe Recipe
        map as handle1
        A
          a -> handle1
        B
          b -> handle1`);
    let recipe = manifest.recipes[0];
    let shape = RecipeUtil.makeShape(['A', 'B'], ['v'],
      {'A': {'a': 'v'}, 'B': {'b': 'v'}});
    let results = RecipeUtil.find(recipe, shape);
    assert(results.length == 1);
    assert(results[0].score == 0);
    assert(results[0].match.A.name == 'A');
    assert(results[0].match.B.name == 'B');
    assert(results[0].match.v.localName == 'handle1');
  });

  it('can produce multiple partial shape matches to a simple recipe', async () => {
    let manifest = await Manifest.parse(`
      schema S
      particle A
        out S a
      particle B
        out S b
      particle C
        out S c

      recipe Recipe
        map as handle1
        map as handle2
        A
          a -> handle1
        B
          b -> handle1
        A
          a -> handle2
        C
          c -> handle2`);
    let recipe = manifest.recipes[0];
    let shape = RecipeUtil.makeShape(['A', 'B', 'C'], ['v'],
      {'A': {'a': 'v'}, 'B': {'b': 'v'}, 'C': {'c': 'v'}});
    let results = RecipeUtil.find(recipe, shape);
    assert(results.length == 2);
    assert(results[0].score == -1);
    assert(results[0].match.A.name == 'A');
    assert(results[0].match.B.name == 'B');
    assert(results[0].match.C.name == 'C');
    assert(results[0].match.v.localName == 'handle1');
    assert(results[1].score == -1);
    assert(results[1].match.A.name == 'A');
    assert(results[1].match.B.name == 'B');
    assert(results[1].match.C.name == 'C');
    assert(results[1].match.v.localName == 'handle2');
  });

  it('can match a free handle', async () => {
    let manifest = await Manifest.parse(`
      particle A
      particle B

      recipe Recipe
        map as h1
        A
        B`);
    let recipe = manifest.recipes[0];
    let shape = RecipeUtil.makeShape(['A', 'B'], ['v'],
      {'A': {'a': 'v'}, 'B': {'b': 'v'}});
    let results = RecipeUtil.find(recipe, shape);
    assert(results.length == 1);
    assert(results[0].score == -3);
    assert(results[0].match.v.localName == 'h1');
  });

  it('can match dangling handle connections', async () => {
    let manifest = await Manifest.parse(`
      schema S
      particle A
        out S a
      particle B
        out S b

      recipe Recipe
        map as h1
        A
          a -> //
        B
          b -> //
        `);
    let recipe = manifest.recipes[0];
    let shape = RecipeUtil.makeShape(['A', 'B'], ['h'],
      {'A': {'a': 'h'}, 'B': {'b': 'h'}});
    let results = RecipeUtil.find(recipe, shape);
    assert(results.length == 1);
    assert(results[0].score == -1);
    assert(results[0].match.h.localName == 'h1');
    assert(results[0].match['A:a'].name == 'a');
    assert(results[0].match['B:b'].name == 'b');
  });
});
