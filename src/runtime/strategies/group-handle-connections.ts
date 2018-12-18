// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

import {assert} from '../../platform/assert-web.js';
import {Strategy} from '../../planning/strategizer.js';
import {Recipe} from '../recipe/recipe.js';
import {Type} from '../type.js';
import {Walker} from '../recipe/walker.js';
import {HandleConnection} from '../recipe/handle-connection.js';
import {Arc} from '../arc.js';

export class GroupHandleConnections extends Strategy {
  _walker: Walker;

  constructor(arc?: Arc, args?) {
    super(arc, args);

    this._walker = new class extends Walker {
      onRecipe(recipe: Recipe, result) {
        // Only apply this strategy if ALL handle connections are named and have types.
        if (recipe.getUnnamedUntypedConnections()) {
          return undefined;
        }
        // Find all unique types used in the recipe that have unbound handle connections.
        const types: Set<Type> = new Set();
        recipe.getFreeConnections().forEach(hc => {
          if (!Array.from(types).find(t => t.equals(hc.type))) {
            types.add(hc.type);
          }
        });

        const groupsByType = new Map();
        types.forEach(type => {
          // Find the particle with the largest number of unbound connections of the same type.
          const countConnectionsByType = (connections: {[index: string]: HandleConnection}) => Object.values(connections).filter(conn => {
            return !conn.isOptional && !conn.handle && type.equals(conn.type);
          }).length;
          const sortedParticles = [...recipe.particles].sort((p1, p2) => {
            return countConnectionsByType(p2.connections) - countConnectionsByType(p1.connections);
          }).filter(p => countConnectionsByType(p.connections) > 0);
          assert(sortedParticles.length > 0);

          // Handle connections of the same particle cannot be bound to the same handle. Iterate on handle connections of the particle
          // with the most connections of the given type, and group each of them with same typed handle connections of other particles.
          const particleWithMostConnectionsOfType = sortedParticles[0];
          const groups = new Map();
          let allTypeHandleConnections = recipe.getTypeHandleConnections(type, particleWithMostConnectionsOfType);

          let iteration = 0;
          while (allTypeHandleConnections.length > 0) {
            Object.values(particleWithMostConnectionsOfType.connections).forEach(handleConnection => {
              if (!type.equals(handleConnection.type)) {
                return;
              }
              if (!groups.has(handleConnection)) {
                groups.set(handleConnection, []);
              }
              const group = groups.get(handleConnection);

              // filter all connections where this particle is already in a group.
              const possibleConnections = allTypeHandleConnections.filter(c => !group.find(gc => gc.particle === c.particle));
              let selectedConn = possibleConnections.find(c => handleConnection.isInput !== c.isInput || handleConnection.isOutput !== c.isOutput);
              // TODO: consider tags.
              // TODO: Slots handle restrictions should also be accounted for when grouping.
              if (!selectedConn) {
                if (possibleConnections.length === 0 || iteration === 0) {
                  // During first iteration only bind opposite direction connections ("in" with "out" and vice versa)
                  // to ensure each group has both direction connections as much as possible.
                  return;
                }
                selectedConn = possibleConnections[0];
              }
              group.push(selectedConn);
              allTypeHandleConnections = allTypeHandleConnections.filter(c => c !== selectedConn);
            });
            iteration++;
          }
          // Remove groups where no connections were bound together.
          groups.forEach((otherConns, conn) => {
            if (otherConns.length === 0) {
              groups.delete(conn);
            } else {
              otherConns.push(conn);
            }
          });

          if (groups.size !== 0) {
            groupsByType.set(type, groups);
          }
        });

        if (groupsByType.size > 0) {
          return recipe => {
            groupsByType.forEach((groups, type) => {
              groups.forEach(group => {
                const recipeHandle = recipe.newHandle();
                group.forEach(conn => {
                  const cloneConn = recipe.updateToClone({conn}).conn;
                  cloneConn.connectToHandle(recipeHandle);
                });
              });
            });
            // TODO: score!
          };
        }
        return undefined;
      }
    }(Walker.Permuted);
  }
  get walker() {
    return this._walker;
  }
  async generate(inputParams) {
    return Recipe.over(this.getResults(inputParams), this.walker, this);
  }
}
