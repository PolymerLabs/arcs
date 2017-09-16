// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

let {Strategy} = require('../../strategizer/strategizer.js');
let Recipe = require('../recipe/recipe.js');
let RecipeWalker = require('../recipe/walker.js');

module.exports = class NameUnnamedConnections extends Strategy {
  async generate(strategizer) {
    var results = Recipe.over(strategizer.generated, new class extends RecipeWalker {
      onViewConnection(recipe, viewConnection) {
        if (viewConnection.name)
          return;   // it is already named.

        if (!viewConnection.particle.spec)
          return;   // it is already named.

        let possibleSpecConns = viewConnection.particle.spec.connections.filter(specConn => {
          // filter specs with matching types that don't have views bound to the corresponding view connection.
          return viewConnection.view.type.equals(specConn.type) &&
                 !viewConnection.particle.getConnectionByName(specConn.name).view;
        });

        return possibleSpecConns.map(specConn => {
          return (recipe, viewConnection) => {
            viewConnection.particle.nameConnection(viewConnection, specConn.name);
            return 1;
          };
        });
      }
    }(RecipeWalker.Permuted), this);

    return { results, generate: null };
  }
}
