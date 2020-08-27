/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {Recipe, ConnectionConstraint} from './lib-recipe.js';
import {RecipeWalker} from './recipe-walker.js';
import {Descendant, Continuation} from './walker.js';

export class ConstraintWalker extends RecipeWalker {
  // Optional handler
  onConstraint?(recipe: Recipe, constraint: ConnectionConstraint): Continuation<Recipe, [ConnectionConstraint]>;

  onResult(result: Descendant<Recipe>) {
    super.onResult(result);
    const recipe: Recipe = result.result as Recipe;

    if (this.onConstraint) {
      for (const constraint of recipe.connectionConstraints) {
        this.visit(this.onConstraint.bind(this), constraint);
      }
    }
  }
}
