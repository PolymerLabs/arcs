
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

import {Strategy} from '../../strategizer/strategizer.js';
import Recipe from '../recipe/recipe.js';
import RecipeWalker from '../recipe/walker.js';

export default class AddUseViews extends Strategy {
  // TODO: move generation to use an async generator.
  async generate(strategizer) {
    var results = Recipe.over(this.getResults(strategizer), new class extends RecipeWalker {
      onRecipe(recipe) {
        // Don't add use views while there are outstanding constraints
        if (recipe.connectionConstraints.length > 0)
          return;
        // Don't add use views to a recipe with free views
        var freeViews = recipe.views.filter(view => view.connections.length == 0);
        if (freeViews.length > 0)
          return;

        var disconnectedConnections = recipe.viewConnections.filter(vc => vc.view == null && !vc.isOptional);

        return recipe => {
          disconnectedConnections.forEach(vc => {
            var clonedVC = recipe.updateToClone({vc}).vc;
            var view = recipe.newView();
            view.fate = 'use';
            clonedVC.connectToView(view);
          });
          return 0;
        };
      }
    }(RecipeWalker.Permuted), this);

    return { results, generate: null };
  }
}
