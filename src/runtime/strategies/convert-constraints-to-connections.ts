// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

import {Strategy} from '../../planning/strategizer.js';
import {Recipe} from '../recipe/recipe.js';
import {Walker} from '../recipe/walker.js';
import {RecipeUtil} from '../recipe/recipe-util.js';
import {ParticleEndPoint, HandleEndPoint, TagEndPoint, InstanceEndPoint} from '../recipe/connection-constraint.js';
import {Arc} from '../arc.js';
import {Modality} from '../modality.js';

export class ConvertConstraintsToConnections extends Strategy {
  modality: Modality;

  constructor(arc: Arc, args?) {
    super(arc, args);
    this.modality = arc.modality;
  }

  async generate(inputParams) {
    const modality = this.modality;
    return Recipe.over(this.getResults(inputParams), new class extends Walker {
      onRecipe(recipe: Recipe) {
        // The particles & handles Sets are used as input to RecipeUtil's shape functionality
        // (this is the algorithm that "finds" the constraint set in the recipe).
        // They track which particles/handles need to be found/created.
        const particles = new Set();
        const handles = new Set();
        // The map object tracks the connections between particles that need to be found/created.
        // It's another input to RecipeUtil.makeShape.
        // tslint:disable-next-line: no-any
        const map: {[index: string]: any} = {};
        const particlesByName = {};
        let handleCount = 0;
        const obligations = [];
        if (recipe.connectionConstraints.length === 0) {
          return undefined;
        }

        for (const constraint of recipe.connectionConstraints) {
          const from = constraint.from;
          const to = constraint.to;
          // Don't process constraints if their listed particles don't match the current modality.
          if (modality
            && from instanceof ParticleEndPoint
            && to instanceof ParticleEndPoint
            && (!from.particle.matchModality(modality) || !to.particle.matchModality(modality))) {
            return undefined;
          }

          const reverse = {'->': '<-', '=': '=', '<-': '->'};

          // Set up initial mappings & input to RecipeUtil.
          let handle;
          let handleIsConcrete = false;
          let createObligation = false;

          if (from instanceof ParticleEndPoint) {
            particles.add(from.particle.name);
            if (map[from.particle.name] == undefined) {
              map[from.particle.name] = {};
              particlesByName[from.particle.name] = from.particle;
            }
            if (from.connection) {
              handleIsConcrete = true;
              handle = map[from.particle.name][from.connection];
            } else {
              createObligation = true;
            }
          }
          if (from instanceof HandleEndPoint) {
            handle = {handle: from.handle, direction: reverse[constraint.direction]};
            handles.add(handle.handle);
          }
          if (to instanceof ParticleEndPoint) {
            particles.add(to.particle.name);
            if (map[to.particle.name] == undefined) {
              map[to.particle.name] = {};
              particlesByName[to.particle.name] = to.particle;
            }
            if (to.connection) {
              handleIsConcrete = true;
              if (!handle) {
                handle =
                    map[to.particle.name][to.connection];
              }
            } else {
              createObligation = true;
            }
          }
          if (to instanceof HandleEndPoint) {
            handle = {handle: to.handle, direction: constraint.direction};
            handles.add(handle.handle);
          }
          if (handle == undefined) {
            handle = {handle: 'v' + handleCount++, direction: constraint.direction};
            if (handleIsConcrete) {
              handles.add(handle.handle);
            }
          }
          if (from instanceof TagEndPoint) {
            handle.tags = from.tags;
          } else if (to instanceof TagEndPoint) {
            handle.tags = to.tags;
          }

          if (createObligation) {
            obligations.push({
              from: from._clone(),
              to: to._clone(),
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
          if (from instanceof ParticleEndPoint) {
            const connection = from.connection;
            if (connection) {
              const existingHandle = map[from.particle.name][connection];
              if (existingHandle) {
                direction = unionDirections(direction, existingHandle.direction);
                if (direction == null) {
                  return undefined;
                }
              }
              map[from.particle.name][connection] = {handle: handle.handle, direction, tags: handle.tags};
            }
          }

          direction = reverse[constraint.direction];
          if (to instanceof ParticleEndPoint) {
            const connection = to.connection;
            if (connection) {
              const existingHandle = map[to.particle.name][connection];
              if (existingHandle) {
                direction = unionDirections(direction, existingHandle.direction);
                if (direction == null) {
                  return undefined;
                }
              }
              map[to.particle.name][connection] = {handle: handle.handle, direction, tags: handle.tags};
            }
          }
        }
        const shape = RecipeUtil.makeShape([...particles.values()], [...handles.values()], map);
        const matches = RecipeUtil.find(recipe, shape);

        const results = RecipeUtil.find(recipe, shape);

        const processedResults = results.filter(match => {
          // Ensure that every handle is either matched, or an input of at least one
          // connected particle in the constraints.
          const resolvedHandles : {[index: string]: boolean} = {};
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

        return processedResults;
      }
    }(Walker.Independent), this);
  }
}
