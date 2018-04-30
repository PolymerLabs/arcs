// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

import {Strategy} from '../../strategizer/strategizer.js';
import {Recipe} from '../recipe/recipe.js';
import {RecipeUtil} from '../recipe/recipe-util.js';
import {Walker} from '../recipe/walker.js';

export class CreateHandles extends Strategy {
  // TODO: move generation to use an async generator.
  async generate(inputParams) {
    return Recipe.over(this.getResults(inputParams), new class extends Walker {
      onHandle(recipe, handle) {
        let counts = RecipeUtil.directionCounts(handle);

        // Don't make a 'create' handle, unless there is someone reading,
        // someone writing and at least 2 particles invloved.
        if (counts.in == 0 || counts.out == 0
            || new Set(handle.connections.map(hc => hc.particle)).size <= 1) {
          return;
        }

        if (!handle.id && handle.fate == '?') {
          return (recipe, handle) => {handle.fate = 'create'; return 1;};
        }
      }
    }(Walker.Permuted), this);
  }
}
