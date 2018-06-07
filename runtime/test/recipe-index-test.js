/**
 * @license
 * Copyright (c) 2018 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {RecipeIndex} from '../recipe-index.js';
import {Manifest} from '../manifest.js';
import {Arc} from '../arc.js';
import {assert} from './chai-web.js';

describe('Recipe index', function() {
  async function extractIndexRecipeStrings(manifestContent) {
    let manifest = (await Manifest.parse(manifestContent));
    for (let recipe of manifest.recipes) {
      assert(recipe.normalize());
    }
    let arc = new Arc({id: 'test-plan-arc', context: manifest});
    let indexRecipes = await arc.recipeIndex.recipes;
    return indexRecipes.map(r => r.toString());
  }

  it('adds use handles as a poor man\'s interface', async () => {
    assert.sameMembers(await extractIndexRecipeStrings(`
      schema Person
      schema Lumberjack

      particle Transform
        in Person person
        out Lumberjack lumberjack

      recipe
        Transform
    `), [
`recipe
  use as handle0 // Lumberjack {}
  use as handle1 // Person {}
  Transform as particle0
    lumberjack -> handle0
    person <- handle1`
    ]);
  });

  it('resolves local slots, but not a root slot', async () => {
    assert.sameMembers(await extractIndexRecipeStrings(`
      particle A
        consume root
          provide detail
      particle B
        consume detail

      recipe
        A
        B
    `), [
`recipe
  A as particle0
    consume root
      provide detail as slot0
  B as particle1
    consume detail as slot0`
    ]);
  });

  it('resolves constraints', async () => {
    assert.sameMembers(await extractIndexRecipeStrings(`
      schema A
      schema B
      schema C

      particle Transform
        in A a
        out B b
      particle TransformAgain
        in B b
        out C c

      recipe
        Transform.b -> TransformAgain.b
    `), [
`recipe
  use as handle0 // A {}
  create as handle1 // B {}
  use as handle2 // C {}
  Transform as particle0
    a <- handle0
    b -> handle1
  TransformAgain as particle1
    b <- handle1
    c -> handle2`
    ]);
  });

  it('does not resolve verbs', async () => {
    assert.sameMembers(await extractIndexRecipeStrings(`
      particle A &verb

      recipe
        &verb
    `), [
`recipe
  &verb`
    ]);
  });

  it('exposes multiple recipes', async () => {
    assert.sameMembers(await extractIndexRecipeStrings(`
      particle A
      particle B

      recipe
        A
      recipe
        B
      recipe
        &verb
    `), [
`recipe
  A as particle0`,
`recipe
  B as particle0`,
`recipe
  &verb`
    ]);
  });
});
