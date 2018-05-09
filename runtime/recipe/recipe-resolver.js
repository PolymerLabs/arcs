// Copyright (c) 2018 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

import {ResolveRecipe} from '../strategies/resolve-recipe.js';

// Provides basic recipe resolution for recipes against a particular arc.
export class RecipeResolver {
  constructor(arc) {
    this._resolver = new ResolveRecipe(arc);
  }

  // Attempts to run basic resolution on the given recipe. Returns a new
  // instance of the recipe normalized and resolved if possible. Returns null if
  // normalization or attempting to resolve slot connection fails.
  async resolve(recipe) {
    recipe = recipe.clone();
    let options = {errors: new Map()};
    if (!recipe.normalize(options)) {
      console.warn(`could not normalize a recipe: ${
              [...options.errors.values()].join('\n')}.\n${recipe.toString()}`);
      return null;
    }

    const result = await this._resolver.generate(
        {generated: [{result: recipe, score: 1}], terminal: []});
    return (result.length == 0) ? null : result[0].result;
  }
}
