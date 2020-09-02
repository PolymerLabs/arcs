/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {assert} from '../../platform/assert-web.js';
import {Arc} from '../../runtime/arc.js';
import {HandleConnectionSpec} from '../../runtime/arcs-types/particle-spec.js';
import {Recipe, Particle} from '../../runtime/recipe/lib-recipe.js';
import {TypeChecker} from '../../runtime/recipe/type-checker.js';
import {Type} from '../../types/lib-types.js';
import {StrategizerWalker, Strategy} from '../strategizer.js';

export class GroupHandleConnections extends Strategy {
  _walker: StrategizerWalker;

  constructor(arc?: Arc, args?) {
    super(arc, args);

    this._walker = new class extends StrategizerWalker {
      onRecipe(recipe: Recipe) {
        // Only apply this strategy if ALL handle connections are named and have types.
        if (recipe.getUnnamedUntypedConnections()) {
          return undefined;
        }
        // All particles must have spec.
        if (recipe.particles.some(p => !p.spec)) {
          return undefined;
        }
        // Find all unique types used in the recipe that have unbound handle connections.
        const types: Set<Type> = new Set();
        recipe.getFreeConnections().forEach(({connSpec}) => {
          if (!Array.from(types).find(type => TypeChecker.compareTypes({type}, {type: connSpec.type}))) {
            types.add(connSpec.type);
          }
        });

        const groupsByType = new Map();
        for (const type of types) {
          const sortedParticles = [...recipe.particles].sort((p1, p2) => {
            return p2.getUnboundConnections(type).length - p1.getUnboundConnections(type).length;
          }).filter(p => p.getUnboundConnections(type).length > 0);
          assert(sortedParticles.length > 0);

          // Handle connections of the same particle cannot be bound to the same handle. Iterate
          // on handle connections of the particle with the most connections of the given type,
          // and group each of them with same typed handle connections of other particles.
          const particleWithMostConnectionsOfType = sortedParticles[0];
          const groups: {
            particle: Particle,
            connSpec: HandleConnectionSpec,
            group: {particle: Particle, connSpec: HandleConnectionSpec}[]
          }[] = [];
          let allTypeHandleConnections = recipe.getFreeConnections(type)
              .filter(c => c.particle !== particleWithMostConnectionsOfType);

          let iteration = 0;
          while (allTypeHandleConnections.length > 0) {
            for (const connSpec of particleWithMostConnectionsOfType.spec.handleConnections) {
              if (!TypeChecker.compareTypes({type}, {type: connSpec.type})) {

                continue;
              }
              if (!groups.find(g => g.particle === particleWithMostConnectionsOfType && g.connSpec === connSpec)) {
                groups.push({particle: particleWithMostConnectionsOfType, connSpec, group: []});
              }
              const group = groups.find(g => g.particle === particleWithMostConnectionsOfType && g.connSpec === connSpec).group;

              // filter all connections where this particle is already in a group.
              const possibleConnections = allTypeHandleConnections.filter(c => !group.find(gc => gc.particle === c.particle));
              let selectedConn = possibleConnections.find(({connSpec}) => connSpec.isInput !== connSpec.isInput || connSpec.isOutput !== connSpec.isOutput);
              // TODO: consider tags.
              // TODO: Slots handle restrictions should also be accounted for when grouping.
              if (!selectedConn) {
                if (possibleConnections.length === 0 || iteration === 0) {
                  // During first iteration only bind opposite direction connections ("in" with "out" and vice versa)
                  // to ensure each group has both direction connections as much as possible.
                  continue;
                }
                selectedConn = possibleConnections[0];
              }
              group.push(selectedConn);
              allTypeHandleConnections = allTypeHandleConnections.filter(({connSpec}) => connSpec !== selectedConn.connSpec);
            }
            iteration++;
          }
          // Remove groups where no connections were bound together.
          for (let i = 0; i < groups.length; ++i) {
            if (groups[i].group.length === 0) {
              groups.splice(i,  1);
            } else {
              groups[i].group.push({particle: groups[i].particle, connSpec: groups[i].connSpec});
            }
          }

          if (groups.length !== 0) {
            groupsByType.set(type, groups);
          }
        }

        if (groupsByType.size > 0) {
          return (recipe: Recipe) => {
            groupsByType.forEach((groups, type) => {
              groups.forEach(({group}) => {
                const recipeHandle = recipe.newHandle();
                for (const {particle, connSpec} of group) {
                  const particleClone = recipe.updateToClone({particle}).particle;
                  if (!particleClone.connections[connSpec.name]) {
                    particleClone.addConnectionName(connSpec.name);
                  }
                  const conn = particleClone.connections[connSpec.name];
                  conn.connectToHandle(recipeHandle);
                }
              });
            });
            return 0;
          };
        }
        return undefined;
      }
    }(StrategizerWalker.Permuted);
  }
  get walker() {
    return this._walker;
  }
  async generate(inputParams) {
    return StrategizerWalker.over(this.getResults(inputParams), this.walker, this);
  }
}
