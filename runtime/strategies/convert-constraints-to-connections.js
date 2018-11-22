// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

import {Strategy} from '../../strategizer/strategizer.js';
import {Recipe} from '../ts-build/recipe/recipe.js';
import {Walker} from '../ts-build/recipe/walker.js';
import {RecipeUtil} from '../ts-build/recipe/recipe-util.js';
import {ParticleEndPoint, HandleEndPoint, TagEndPoint, InstanceEndPoint} from '../ts-build/recipe/connection-constraint.js';

export class ConvertConstraintsToConnections extends Strategy {
  constructor(arc) {
    super();
    this.affordance = arc.pec.slotComposer ? arc.pec.slotComposer.affordance : null;
  }
  async generate(inputParams) {
    const affordance = this.affordance;
    return Recipe.over(this.getResults(inputParams), new class extends Walker {
      onRecipe(recipe) {
        // The particles & handles Sets are used as input to RecipeUtil's shape functionality
        // (this is the algorithm that "finds" the constraint set in the recipe).
        // They track which particles/handles need to be found/created.
        const particles = new Set();
        const handles = new Set();
        // The map object tracks the connections between particles that need to be found/created.
        // It's another input to RecipeUtil.makeShape.
        const map = {};
        const particlesByName = {};
        let handleCount = 0;
        const obligations = [];
        if (recipe.connectionConstraints.length === 0) {
          return undefined;
        }

        for (const constraint of recipe.connectionConstraints) {
          // Don't process constraints if their listed particles don't match the current affordance.
          if (affordance && (!constraint.from.particle.matchAffordance(affordance) || !constraint.to.particle.matchAffordance(affordance))) {
            return undefined;
          }

          const reverse = {'->': '<-', '=': '=', '<-': '->'};

          // Set up initial mappings & input to RecipeUtil.
          let handle;
          let handleIsConcrete = false;
          let createObligation = false;
          if (constraint.from instanceof ParticleEndPoint) {
            particles.add(constraint.from.particle.name);
            if (map[constraint.from.particle.name] == undefined) {
              map[constraint.from.particle.name] = {};
              particlesByName[constraint.from.particle.name] = constraint.from.particle;
            }
            if (constraint.from.connection) {
              handleIsConcrete = true;
              handle = map[constraint.from.particle.name][constraint.from.connection];
            } else {
              createObligation = true;
            }
          }
          if (constraint.from instanceof HandleEndPoint) {
            handle = {handle: constraint.from.handle, direction: reverse[constraint.direction]};
            handles.add(handle.handle);
          }
          if (constraint.to instanceof ParticleEndPoint) {
            particles.add(constraint.to.particle.name);
            if (map[constraint.to.particle.name] == undefined) {
              map[constraint.to.particle.name] = {};
              particlesByName[constraint.to.particle.name] = constraint.to.particle;
            }
            if (constraint.to.connection) {
              handleIsConcrete = true;
              if (!handle) {
                handle =
                    map[constraint.to.particle.name][constraint.to.connection];
              }
            } else {
              createObligation = true;
            }
          }
          if (constraint.to instanceof HandleEndPoint) {
            handle = {handle: constraint.to.handle, direction: constraint.direction};
            handles.add(handle.handle);
          }
          if (handle == undefined) {
            handle = {handle: 'v' + handleCount++, direction: constraint.direction};
            if (handleIsConcrete) {
              handles.add(handle.handle);
            }
          }
          if (constraint.from instanceof TagEndPoint) {
            handle.tags = constraint.from.tags;
          } else if (constraint.to instanceof TagEndPoint) {
            handle.tags = constraint.to.tags;
          }

          if (createObligation) {
            obligations.push({
              from: constraint.from._clone(),
              to: constraint.to._clone(),
              direction: constraint.direction
            });
          }

          const unionDirections = (a, b) => {
            if (a === '=') {
              return '=';
            }
            if (b === '=') {
              return '=';
            }
            if (a !== b) {
              return '=';
            }
            return a;
          };

          let direction = constraint.direction;
          if (constraint.from instanceof ParticleEndPoint) {
            const connection = constraint.from.connection;
            if (connection) {
              const existingHandle = map[constraint.from.particle.name][connection];
              if (existingHandle) {
                direction = unionDirections(direction, existingHandle.direction);
                if (direction == null) {
                  return undefined;
                }
              }
              map[constraint.from.particle.name][connection] = {handle: handle.handle, direction, tags: handle.tags};
            }
          }

          direction = reverse[constraint.direction];          
          if (constraint.to instanceof ParticleEndPoint) {
            const connection = constraint.to.connection;
            if (connection) {
              const existingHandle = map[constraint.to.particle.name][connection];
              if (existingHandle) {
                direction = unionDirections(direction, existingHandle.direction);
                if (direction == null) {
                  return undefined;
                }
              }
              map[constraint.to.particle.name][connection] = {handle: handle.handle, direction, tags: handle.tags};
            }
          }
        }
        const shape = RecipeUtil.makeShape([...particles.values()], [...handles.values()], map);
        const matches = RecipeUtil.find(recipe, shape);

        const results = matches.filter(match => {
          // Ensure that every handle is either matched, or an input of at least one
          // connected particle in the constraints.
          const resolvedHandles = {};
          for (const particle of Object.keys(map)) {
            for (const connection of Object.keys(map[particle])) {
              const handle = map[particle][connection].handle;
              if (resolvedHandles[handle]) {
                continue;
              }
              if (match.match[handle]) {
                resolvedHandles[handle] = true;
              } else {
                const spec = particlesByName[particle];
                resolvedHandles[handle] = spec.isOutput(connection);
              }
            }
          }
          return Object.values(resolvedHandles).every(value => value);
        }).map(match => {
          return (recipe) => {
            const score = recipe.connectionConstraints.length + match.score;
            const recipeMap = recipe.updateToClone(match.match);
            
            for (const particle of Object.keys(map)) {
              let recipeParticle = recipeMap[particle];
              if (!recipeParticle) {
                recipeParticle = recipe.newParticle(particle);
                recipeParticle.spec = particlesByName[particle];
                recipeMap[particle] = recipeParticle;
              }

              for (const connection of Object.keys(map[particle])) {
                const handle = map[particle][connection];
                let recipeHandleConnection = recipeParticle.connections[connection];
                if (recipeHandleConnection == undefined) {
                  recipeHandleConnection =
                      recipeParticle.addConnectionName(connection);
                }
                let recipeHandle = recipeMap[handle.handle];
                if (recipeHandle == null && recipeHandleConnection.handle == null) {
                  recipeHandle = recipe.newHandle();
                  recipeHandle.fate = 'create';
                  recipeHandle.tags = handle.tags || [];
                  recipeMap[handle.handle] = recipeHandle;
                }
                if (recipeHandleConnection.handle == null) {
                  recipeHandleConnection.connectToHandle(recipeHandle);
                }
              }
            }
            recipe.clearConnectionConstraints();
            for (const obligation of obligations) {
              const from = new InstanceEndPoint(recipeMap[obligation.from.particle.name], obligation.from.connection);
              const to = new InstanceEndPoint(recipeMap[obligation.to.particle.name], obligation.to.connection);
              recipe.newObligation(from, to, obligation.direction);
            }
            return score;
          };
        });

        return results;
      }
    }(Walker.Independent), this);
  }
}
