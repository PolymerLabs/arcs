// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

import {Strategy} from '../../strategizer/strategizer.js';
import Recipe from '../recipe/recipe.js';
import RecipeWalker from '../recipe/walker.js';

export default class NameUnnamedConnections extends Strategy {
  async generate(strategizer) {
    let results = Recipe.over(this.getResults(strategizer), new class extends RecipeWalker {
      onHandleConnection(recipe, handleConnection) {
        if (handleConnection.name)
          return; // it is already named.

        if (!handleConnection.particle.spec)
          return; // the particle doesn't have spec yet.

        let possibleSpecConns = handleConnection.particle.spec.connections.filter(specConn => {
          // filter specs with matching types that don't have views bound to the corresponding view connection.
          return !specConn.isOptional &&
                 handleConnection.view.type.equals(specConn.type) &&
                 !handleConnection.particle.getConnectionByName(specConn.name).view;
        });

        return possibleSpecConns.map(specConn => {
          return (recipe, handleConnection) => {
            handleConnection.particle.nameConnection(handleConnection, specConn.name);
            return 1;
          };
        });
      }
    }(RecipeWalker.Permuted), this);

    return {results, generate: null};
  }
}
