// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

import assert from '../../platform/assert-web.js';
import {Strategy} from '../../strategizer/strategizer.js';
import Recipe from '../recipe/recipe.js';
import RecipeWalker from '../recipe/walker.js';

export default class CreateDescriptionHandle extends Strategy {
  async generate(strategizer) {
    let results = Recipe.over(this.getResults(strategizer), new class extends RecipeWalker {
      onViewConnection(recipe, viewConnection) {
        if (viewConnection.view)
          return;
        if (viewConnection.name != 'descriptions')
          return;

        return (recipe, viewConnection) => {
          let view = recipe.newView();
          view.fate = 'create';
          viewConnection.connectToView(view);
          return 1;
        };
      }
    }(RecipeWalker.Permuted), this);

    return {results, generate: null};
  }
}
