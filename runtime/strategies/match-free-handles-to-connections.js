// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

import {Strategy} from '../../strategizer/strategizer.js';
import RecipeWalker from '../recipe/walker.js';
import Recipe from '../recipe/recipe.js';
import RecipeUtil from '../recipe/recipe-util.js';
import assert from '../../platform/assert-web.js';

/*
 * Match free handles (i.e. handles that aren't connected to any connections)
 * to connections.
 */
export default class MatchFreeHandlesToConnections extends Strategy {
  async generate(strategizer) {
    let self = this;

    let results = Recipe.over(this.getResults(strategizer), new class extends RecipeWalker {
      onView(recipe, handle) {
        if (handle.connections.length > 0)
          return;

        let matchingConnections = recipe.handleConnections.filter(connection => connection._handle == undefined);
           
        return matchingConnections.map(connection => {
          return (recipe, handle) => {
            let newConnection = recipe.updateToClone({connection}).connection;
            newConnection.connectToView(handle);
            return 1;
          };
        });
      }
    }(RecipeWalker.Permuted), this);

    return {results, generate: null};
  }
}
