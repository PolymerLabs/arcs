/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {HandleEndPoint, InstanceEndPoint, ParticleEndPoint, TagEndPoint, EndPoint} from '../../runtime/recipe/connection-constraint.js';
import {RecipeUtil, HandleRepr} from '../../runtime/recipe/recipe-util.js';
import {Recipe} from '../../runtime/recipe/recipe.js';
import {StrategizerWalker, Strategy, StrategyParams} from '../strategizer.js';
import {ParticleSpec} from '../../runtime/particle-spec.js';
import {reverseDirection} from '../../runtime/recipe/recipe-util.js';
import {Direction} from '../../runtime/manifest-ast-nodes.js';
import {Descendant} from '../../runtime/recipe/walker.js';
import {Handle} from '../../runtime/recipe/handle.js';
import {Dictionary} from '../../runtime/hot.js';

type Obligation = {from: EndPoint, to: EndPoint, direction: Direction};

export class ConvertConstraintsToConnections extends Strategy {
  async generate(inputParams: StrategyParams): Promise<Descendant<Recipe>[]> {
    const arcModality = this.arc.modality;
    return StrategizerWalker.over(this.getResults(inputParams), new class extends StrategizerWalker {
      onRecipe(recipe: Recipe) {
        if (recipe.connectionConstraints.length === 0) {
          return undefined;
        }

        const modality = arcModality.intersection(recipe.modality);
        // The particles & handles Sets are used as input to RecipeUtil's shape functionality
        // (this is the algorithm that "finds" the constraint set in the recipe).
        // They track which particles/handles need to be found/created.
        const particles = new Set<string>();
        const handleNames = new Map<Handle, string>();
        const handles = new Set<string>();
        // The map object tracks the connections between particles that need to be found/created.
        // It's another input to RecipeUtil.makeShape.
        const map: Dictionary<Dictionary<HandleRepr>> = {};
        const particlesByName: Dictionary<ParticleSpec> = {};

        let handleNameIndex = 0;
        function nameForHandle(handle: Handle, existingNames: Map<Handle, string>): string {
          if (existingNames.has(handle)) {
            return existingNames.get(handle);
          }
          if (handle.localName) {
            if (!handles.has(handle.localName)) {
              existingNames.set(handle, handle.localName);
              return handle.localName;
            }
          }
          while (!handles.has('handle' + handleNameIndex)) {
            handleNameIndex++;
          }
          existingNames.set(handle, 'handle' + handleNameIndex);
          return 'handle' + (handleNameIndex++);
        }

        let handleCount = 0;
        const obligations: Obligation[] = [];

        for (const constraint of recipe.connectionConstraints) {
          const from = constraint.from;
          const to = constraint.to;
          // Don't process constraints if their listed particles don't match the current modality.
          if (from instanceof ParticleEndPoint
              && to instanceof ParticleEndPoint
              && (!from.particle.isCompatible(modality) || !to.particle.isCompatible(modality))) {
            return undefined;
          }

          // Set up initial mappings & input to RecipeUtil.
          let handle: HandleRepr;
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
            handle = {handle: nameForHandle(from.handle, handleNames), direction: reverseDirection(constraint.direction), localName: from.handle.localName};
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
            handle = {handle: nameForHandle(to.handle, handleNames), direction: constraint.direction, localName: to.handle.localName};
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

          const unionDirections = (a: Direction, b: Direction): Direction => {
            // TODO(jopra): Move to be with other handle direction + type resolution code.
            if (a === 'any') {
              return 'any';
            }
            if (b === 'any') {
              return 'any';
            }
            if (a !== b) {
              // TODO(jopra): Double check this, should require both directions.
              return 'any';
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
              map[from.particle.name][connection] = {handle: handle.handle, direction, tags: handle.tags, localName: handle.localName};
            }
          }

          direction = reverseDirection(constraint.direction);
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
              map[to.particle.name][connection] = {handle: handle.handle, direction, tags: handle.tags, localName: handle.localName};
            }
          }
        }

        const shape = RecipeUtil.makeShape([...particles.values()], [...handles.values()], map);

        const results = RecipeUtil.find(recipe, shape);

        const processedResults = results.filter(match => {
          // Ensure that every handle is either matched, or an input of at least one
          // connected particle in the constraints.
          const resolvedHandles : Dictionary<boolean> = {};
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
          return (recipe: Recipe) => {
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
              if ((obligation.from instanceof ParticleEndPoint) && (obligation.to instanceof ParticleEndPoint)) {
                const from = new InstanceEndPoint(recipeMap[obligation.from.particle.name], obligation.from.connection);
                const to = new InstanceEndPoint(recipeMap[obligation.to.particle.name], obligation.to.connection);
                recipe.newObligation(from, to, obligation.direction);
              } else {
                throw new Error('constraints with a particle endpoint at one end but not at the other are not supported');
              }
            }
            return score;
          };
        });

        return processedResults;
      }
    }(StrategizerWalker.Independent), this);
  }
}
