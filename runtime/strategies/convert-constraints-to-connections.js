// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

import {Strategy} from '../../strategizer/strategizer.js';
import {Recipe} from '../recipe/recipe.js';
import {Walker} from '../recipe/walker.js';
import {RecipeUtil} from '../recipe/recipe-util.js';

export class ConvertConstraintsToConnections extends Strategy {
  constructor(arc) {
    super();
    this.affordance = arc.pec.slotComposer ? arc.pec.slotComposer.affordance : null;
  }
  async generate(inputParams) {
    let affordance = this.affordance;
    return Recipe.over(this.getResults(inputParams), new class extends Walker {
      onRecipe(recipe) {
        let particles = new Set();
        let handles = new Set();
        let map = {};
        let particlesByName = {};
        let handleCount = 0;
        if (recipe.connectionConstraints.length == 0) {
          return;
        }

        for (let constraint of recipe.connectionConstraints) {
          if (affordance && (!constraint.fromParticle.matchAffordance(affordance) || !constraint.toParticle.matchAffordance(affordance))) {
            return;
          }
          particles.add(constraint.fromParticle.name);
          if (map[constraint.fromParticle.name] == undefined) {
            map[constraint.fromParticle.name] = {};
            particlesByName[constraint.fromParticle.name] = constraint.fromParticle;
          }
          particles.add(constraint.toParticle.name);
          if (map[constraint.toParticle.name] == undefined) {
            map[constraint.toParticle.name] = {};
            particlesByName[constraint.toParticle.name] = constraint.toParticle;
          }
          let handle = map[constraint.fromParticle.name][constraint.fromConnection] || map[constraint.toParticle.name][constraint.toConnection];
          if (handle == undefined) {
            handle = 'v' + handleCount++;
            handles.add(handle);
          }
          map[constraint.fromParticle.name][constraint.fromConnection] = handle;
          map[constraint.toParticle.name][constraint.toConnection] = handle;
        }
        let shape = RecipeUtil.makeShape([...particles.values()], [...handles.values()], map);
        let results = RecipeUtil.find(recipe, shape);

        return results.filter(match => {
          // Ensure that every handle is either matched, or an input of at least one
          // connected particle in the constraints.
          let resolvedHandles = {};
          for (let particle in map) {
            for (let connection in map[particle]) {
              let handle = map[particle][connection];
              if (resolvedHandles[handle]) {
                continue;
              }
              if (match.match[handle]) {
                resolvedHandles[handle] = true;
              } else {
                let spec = particlesByName[particle];
                resolvedHandles[handle] = spec.isOutput(connection);
              }
            }
          }
          return Object.values(resolvedHandles).every(value => value);
        }).map(match => {
          return (recipe) => {
            let score = recipe.connectionConstraints.length + match.score;
            let recipeMap = recipe.updateToClone(match.match);
            for (let particle in map) {
              for (let connection in map[particle]) {
                let handle = map[particle][connection];
                let recipeParticle = recipeMap[particle];
                if (recipeParticle == null) {
                  recipeParticle = recipe.newParticle(particle);
                  recipeParticle.spec = particlesByName[particle];
                  recipeMap[particle] = recipeParticle;
                }
                let recipeHandleConnection = recipeParticle.connections[connection];
                if (recipeHandleConnection == undefined)
                  recipeHandleConnection = recipeParticle.addConnectionName(connection);
                let recipeHandle = recipeMap[handle];
                if (recipeHandle == null) {
                  recipeHandle = recipe.newHandle();
                  recipeHandle.fate = 'create';
                  recipeMap[handle] = recipeHandle;
                }
                if (recipeHandleConnection.handle == null)
                  recipeHandleConnection.connectToHandle(recipeHandle);
              }
            }
            recipe.clearConnectionConstraints();
            return score;
          };
        });
      }
    }(Walker.Independent), this);
  }
}
