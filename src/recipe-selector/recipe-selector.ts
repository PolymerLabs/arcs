/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {Recipe} from '../runtime/recipe/recipe.js';
import {Dictionary} from '../runtime/hot.js';

export class RecipeSelector {
    // Only recipes with “@trigger” annotations get included in the lookup table.
    // Other recipes are silently ignored.
    // Specific semantics of overlapping triggers are still TBD.
    constructor(readonly recipes: Recipe[]) {
    }
    // Returns a Recipe or null if no trigger matches the request)
    select(trigger: [string][]) : Recipe | null {
      return null;
    }
}
