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

export default class CreateViews extends Strategy {
  // TODO: move generation to use an async generator.
  async generate(inputParams) {
    return Recipe.over(this.getResults(inputParams), new class extends RecipeWalker {
      onView(recipe, view) {
        let counts = RecipeUtil.directionCounts(view);

        let score = 1;
        if (counts.in == 0 || counts.out == 0) {
          if (counts.unknown > 0)
            return;
          if (counts.in == 0)
            score = -1;
          else
            score = 0;
        }

        if (!view.id && view.fate == '?') {
          return (recipe, view) => {view.fate = 'create'; return score;};
        }
      }
    }(RecipeWalker.Permuted), this);
  }
}
