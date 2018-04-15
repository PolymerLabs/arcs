// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

import {Strategy} from '../../strategizer/strategizer.js';
import Recipe from '../recipe/recipe.js';
import RecipeUtil from '../recipe/recipe-util.js';
import RecipeWalker from '../recipe/walker.js';

export default class CreateHandles extends Strategy {
  // TODO: move generation to use an async generator.
  async generate(inputParams) {
    return Recipe.over(this.getResults(inputParams), new class extends RecipeWalker {
      onView(recipe, view) {
        let counts = RecipeUtil.directionCounts(view);

        // Don't make a 'create' handle, unless there is someone reading,
        // someone writing and at least 2 particles invloved.
        if (counts.in == 0 || counts.out == 0
            // TODO: Allow checking number of particles without touching privates.
            || new Set(view.connections.map(hc => hc._particle)).size <= 1) {
          return;
        }

        if (!view.id && view.fate == '?') {
          return (recipe, view) => {view.fate = 'create'; return 1;};
        }
      }
    }(RecipeWalker.Permuted), this);
  }
}
