/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {Arc} from '../runtime/arc.js';
import {Recipe} from '../runtime/recipe/recipe.js';
import {RecipeResolver} from '../runtime/recipe/recipe-resolver.js';

// One entry in the lookup table, i.e. one trigger and the recipe it invokes.
// Exported only for testing.
export class Match {
  constructor(readonly trigger: [string, string][], readonly recipe: Recipe) {}

  // The definition of a matching trigger is embodied in this function.
  // This first implementation matches if every key-value pair in the trigger
  // is present in the request. The request may contain other pairs, and the
  // order of the matching pairs need not be the same as the order in the trigger.
  matches(request: [string, string][]): boolean {
    if (this.trigger.length > request.length) return false;
    for (const pair of this.trigger) {
      const found = request.findIndex(r => r[0] === pair[0] && r[1] === pair[1]);
      if (found === -1) return false;
    }
    return true;
  }
}

/**
 * A very simple planner that looks up recipes based on triggers in the
 * manifest file matching requests.
 */
export class SimplePlanner {
  private _recipesByTrigger: Match[] = [];

  // For testing only
  get recipesByTrigger() {
    return this._recipesByTrigger;
  }

  // Only recipes with “@trigger” annotations get included in the lookup table.
  // Other recipes are silently ignored. This relies on the triggers array
  // being always present but empty if there are no triggers.
  // The order of the Matches in the lookup table preserves the order of the
  // Recipes in the constructor argument, and within each recipe the order of
  // the triggers in the triggers field of the recipe.
  constructor(readonly recipes: Recipe[]) {
    recipes.forEach(recipe => {
      recipe.triggers.forEach(trigger => {
        this._recipesByTrigger.push(new Match(trigger, recipe));
      });
    });
  }

  // Returns a Recipe or null if no suitable recipe is found. A suitable recipe
  // is the first recipe in the table that meets three conditions:
  // 1 - All pairs in the trigger are in the request.
  // 2 - The modality of the arc is compatible with the recipe.
  // 3 - The recipe resolves.
  async plan(arc: Arc, request:  [string, string][]): Promise<Recipe> {
    const resolver = new RecipeResolver(arc);
    const arcModality = arc.modality; // Avoid calling this more than once.
    for (let i = 0; i < this._recipesByTrigger.length; i++) {
      const match = this._recipesByTrigger[i];
      if (match.matches(request)) {
        if (match.recipe.isCompatible(arcModality)) {
          const result = await resolver.resolve(match.recipe);
          if (result) return result;
        }
      }
    }
    return null;
  }
}
