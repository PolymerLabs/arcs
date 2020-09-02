/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {InstanceEndPoint} from '../../runtime/recipe/internal/connection-constraint.js';
import {RecipeUtil, HandleRepr} from '../../runtime/recipe/recipe-util.js';
import {Recipe, EndPoint, Handle, ParticleEndPoint} from '../../runtime/recipe/lib-recipe.js';
import {StrategizerWalker, Strategy, StrategyParams} from '../strategizer.js';
import {ParticleSpec} from '../../runtime/arcs-types/particle-spec.js';
import {reverseDirection} from '../../runtime/recipe/recipe-util.js';
import {Direction} from '../../runtime/arcs-types/enums.js';
import {Descendant} from '../../runtime/recipe/walker.js';
import {Dictionary} from '../../utils/hot.js';

type Obligation = {from: EndPoint, to: EndPoint, direction: Direction, relaxed: boolean};

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
          let failedModalityChecks = false;

          // Set up initial mappings & input to RecipeUtil.
          let handle: HandleRepr;
          let handleIsConcrete = false;
          let createObligation = false;
          let tags: string[] = [];

          [constraint.from, constraint.to].forEach(endPoint => endPoint.select({
            isParticleEndPoint(endPoint) {
              if (!endPoint.particle.isCompatible(modality)) {
                failedModalityChecks = true;
              }
              particles.add(endPoint.particle.name);
              if (map[endPoint.particle.name] == undefined) {
                map[endPoint.particle.name] = {};
                particlesByName[endPoint.particle.name] = endPoint.particle;
              }
              if (endPoint.connection) {
                handleIsConcrete = true;
                if (!handle) {
                  handle = map[endPoint.particle.name][endPoint.connection];
                }
              } else {
                createObligation = true;
              }
            },
            isHandleEndPoint(endPoint) {
              handle = {handle: nameForHandle(endPoint.handle, handleNames), direction: reverseDirection(constraint.direction), localName: endPoint.handle.localName};
              handles.add(handle.handle);
            },
            isTagEndPoint(endPoint) {
              tags = endPoint.tags;
            }
          }));

          // Don't process constraints if their listed particles don't match the current modality.
          if (failedModalityChecks) {
            return undefined;
          }

          if (handle == undefined) {
            handle = {handle: 'v' + handleCount++, direction: constraint.direction, tags};
            if (handleIsConcrete) {
              handles.add(handle.handle);
            }
          } else {
            handle.tags = tags;
          }

          if (createObligation) {
            obligations.push({
              from: constraint.from._clone(),
              to: constraint.to._clone(),
              direction: constraint.direction,
              relaxed: constraint.relaxed
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

          const selector = (direction: Direction) => ({
            isParticleEndPoint(endPoint: ParticleEndPoint): void {
              const connection = endPoint.connection;
              if (connection) {
                const existingHandle = map[endPoint.particle.name][connection];
                if (existingHandle) {
                  direction = unionDirections(direction, existingHandle.direction);
                  if (direction == null) {
                    return undefined;
                  }
                }
                map[endPoint.particle.name][connection] = {handle: handle.handle, direction, tags: handle.tags, localName: handle.localName};
              }
            }
          });

          constraint.from.select(selector(constraint.direction));
          constraint.to.select(selector(reverseDirection(constraint.direction)));
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
              const obligationFrom = obligation.from.requireParticleEndPoint(
                () => 'constraints currently require particle endpoints at each end');
              const obligationTo = obligation.to.requireParticleEndPoint(
                () => 'constraints currently require particle endpoints at each end');
              const from = new InstanceEndPoint(recipeMap[obligationFrom.particle.name], obligationFrom.connection);
              const to = new InstanceEndPoint(recipeMap[obligationTo.particle.name], obligationTo.connection);
              recipe.newObligation(from, to, obligation.direction, obligation.relaxed);
            }
            return score;
          };
        });

        return processedResults;
      }
    }(StrategizerWalker.Independent), this);
  }
}
