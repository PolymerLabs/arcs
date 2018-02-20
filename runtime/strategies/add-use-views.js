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
    let results = Recipe.over(this.getResults(strategizer), new class extends RecipeWalker {
      onRecipe(recipe) {
        // Don't add use views while there are outstanding constraints
        if (recipe.connectionConstraints.length > 0)
          return;
        // Don't add use views to a recipe with free views
        let freeViews = recipe.views.filter(view => view.connections.length == 0);
        if (freeViews.length > 0)
          return;

        // TODO: "description" handles are always created, and in the future they need to be "optional" (blocked by optional handles
        // not being properly supported in arc instantiation). For now just hardcode skiping them.
        let disconnectedConnections = recipe.handleConnections.filter(hc => hc.view == null && !hc.isOptional && hc.name != 'descriptions');

        return recipe => {
          disconnectedConnections.forEach(hc => {
            let clonedHC = recipe.updateToClone({hc}).hc;
            let view = recipe.newHandle();
            view.fate = 'use';
            clonedHC.connectToView(view);
          });
          return 0;
        };
      }
    }(RecipeWalker.Permuted), this);

    return {results, generate: null};
  }
}
