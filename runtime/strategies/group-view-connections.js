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

export default class GroupViewConnections extends Strategy {
  constructor() {
    super();

    this._walker = new class extends RecipeWalker {
      onRecipe(recipe) {
        // Only apply this strategy if ALL view connections are named and have types.
        if (recipe.viewConnections.find(vc => !vc.type || !vc.name || vc.isOptional)) {
          return;
        }
        // Find all unique types used in the recipe that have unbound view connections.
        let types = new Set();
        recipe.viewConnections.forEach(vc => {
          if (!vc.isOptional && !vc.view && !Array.from(types).find(t => t.equals(vc.type))) {
            types.add(vc.type);
          }
        });

        let groupsByType = new Map();
        types.forEach(type => {
          // Find the particle with the largest number of unbound connections of the same type.
          let countConnectionsByType = (connections) => Object.values(connections).filter(conn => {
            return !conn.isOptional && !conn.view && type.equals(conn.type);
          }).length;
          let sortedParticles = [...recipe.particles].sort((p1, p2) => {
            return countConnectionsByType(p2.connections) - countConnectionsByType(p1.connections);
          }).filter(p => countConnectionsByType(p.connections) > 0);
          assert(sortedParticles.length > 0);

          // View connections of the same particle cannot be bound to the same view. Iterate on view connections of the particle
          // with the most connections of the given type, and group each of them with same typed view connections of other particles.
          let particleWithMostConnectionsOfType = sortedParticles[0];
          let groups = new Map();
          groupsByType.set(type, groups);
          let allTypeViewConnections = recipe.viewConnections.filter(c => {
            return !c.isOptional && !c.view && type.equals(c.type) && (c.particle != particleWithMostConnectionsOfType);
          });

          let iteration = 0;
          while(allTypeViewConnections.length > 0) {
            Object.values(particleWithMostConnectionsOfType.connections).forEach(viewConnection => {
              if (!type.equals(viewConnection.type)) {
                return;
              }
              if (!groups.has(viewConnection)) {
                groups.set(viewConnection, []);
              }
              let group = groups.get(viewConnection);

              // filter all connections where this particle is already in a group.
              let possibleConnections = allTypeViewConnections.filter(c => !group.find(gc => gc.particle == c.particle));
              let selectedConn = possibleConnections.find(c => viewConnection.isInput != c.isInput || viewConnection.isOutput != c.isOutput);
              // TODO: consider tags.
              // TODO: Slots view restrictions should also be accounted for when grouping.
              if (!selectedConn) {
                if (possibleConnections.length == 0 || iteration == 0) {
                  // During first iteration only bind opposite direction connections ("in" with "out" and vice versa)
                  // to ensure each group has both direction connections as much as possible.
                  return;
                }
                selectedConn = possibleConnections[0];
              }
              group.push(selectedConn);
              allTypeViewConnections = allTypeViewConnections.filter(c => c != selectedConn);
            });
            iteration++;
          }
          // Remove groups where no connections were bound together.
          groups.forEach((otherConns, conn) => {
            if (otherConns.length == 0) {
              groups.delete(conn);
            } else {
              otherConns.push(conn);
            }
          });
        });

        return recipe => {
          groupsByType.forEach((groups, type) => {
            groups.forEach(group => {
              let recipeView = recipe.newView();
              group.forEach(conn => {
                let cloneConn = recipe.updateToClone({conn}).conn;
                cloneConn.connectToView(recipeView)
              });
            });
          });
          // TODO: score!
        };
      }
    }(RecipeWalker.Permuted);
  }
  get walker() {
    return this._walker;
  }
  async generate(strategizer) {
    return {
      results: Recipe.over(this.getResults(strategizer), this.walker, this),
      generate: null,
    };
  }
};
