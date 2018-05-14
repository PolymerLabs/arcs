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
import {ParticleConnection, HandleEndPoint} from '../recipe/connection-constraint.js';

export class ConvertConstraintsToConnections extends Strategy {
  constructor(arc) {
    super();
    this.affordance = arc.pec.slotComposer ? arc.pec.slotComposer.affordance : null;
  }
  async generate(inputParams) {
    let affordance = this.affordance;
    return Recipe.over(this.getResults(inputParams), new class extends Walker {
      onRecipe(recipe) {
        // The particles & handles Sets are used as input to RecipeUtil's shape functionality
        // (this is the algorithm that "finds" the constraint set in the recipe).
        // They track which particles/handles need to be found/created.
        let particles = new Set();
        let handles = new Set();
        // The map object tracks the connections between particles that need to be found/created.
        // It's another input to RecipeUtil.makeShape.
        let map = {};
        let particlesByName = {};
        let handleCount = 0;
        if (recipe.connectionConstraints.length == 0) {
          return;
        }

        for (let constraint of recipe.connectionConstraints) {
          // Don't process constraints if their listed particles don't match the current affordance.
          if (affordance && (!constraint.from.particle.matchAffordance(affordance) || !constraint.to.particle.matchAffordance(affordance))) {
            return;
          }

          let reverse = {'->': '<-', '=': '=', '<-': '->'};

          // Set up initial mappings & input to RecipeUtil.
          let handle;
          if (constraint.from instanceof ParticleConnection) {
            particles.add(constraint.from.particle.name);
            if (map[constraint.from.particle.name] == undefined) {
              map[constraint.from.particle.name] = {};
              particlesByName[constraint.from.particle.name] = constraint.from.particle;
            }
            handle = map[constraint.from.particle.name][constraint.from.connection];
          }
          if (constraint.from instanceof HandleEndPoint) {
            handle = {handle: constraint.from.handle, direction: reverse[constraint.direction]};
            handles.add(handle.handle);
          }
          if (constraint.to instanceof ParticleConnection) {
            particles.add(constraint.to.particle.name);
            if (map[constraint.to.particle.name] == undefined) {
              map[constraint.to.particle.name] = {};
              particlesByName[constraint.to.particle.name] = constraint.to.particle;
            }
            if (!handle)
              handle = map[constraint.to.particle.name][constraint.to.connection];
          }
          if (constraint.to instanceof HandleEndPoint) {
            handle = {handle: constraint.to.handle, direction: constraint.direction};
            handles.add(handle.handle);
          }
          if (handle == undefined) {
            handle = {handle: 'v' + handleCount++, direction: constraint.direction};
            handles.add(handle.handle);
          }

          let unionDirections = (a, b) => {
            if (a == '=')
              return '=';
            if (b == '=')
              return '=';
            if (a !== b)
              return '=';
            return a;
          };

          let direction = constraint.direction;
          if (constraint.from instanceof ParticleConnection) {
            let existingHandle = map[constraint.from.particle.name][constraint.from.connection];
            if (existingHandle) {
              direction = unionDirections(direction, existingHandle.direction);
              if (direction == null)
                return;
            }
            map[constraint.from.particle.name][constraint.from.connection] = {handle: handle.handle, direction};
          }

          direction = reverse[constraint.direction];          
          if (constraint.to instanceof ParticleConnection) {
            let existingHandle = map[constraint.to.particle.name][constraint.to.connection];
            if (existingHandle) {
              direction = unionDirections(direction, existingHandle.direction);
              if (direction == null)
                return;
            }
            map[constraint.to.particle.name][constraint.to.connection] = {handle: handle.handle, direction};
          }
        }
        let shape = RecipeUtil.makeShape([...particles.values()], [...handles.values()], map);
        let results = RecipeUtil.find(recipe, shape);

        return results.filter(match => {
          // Ensure that every handle is either matched, or an input of at least one
          // connected particle in the constraints.
          let resolvedHandles = {};
          for (let particle in map) {
            for (let connection in map[particle]) {
              let handle = map[particle][connection].handle;
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
                let recipeHandle = recipeMap[handle.handle];
                if (recipeHandle == null) {
                  recipeHandle = recipe.newHandle();
                  recipeHandle.fate = 'create';
                  recipeMap[handle.handle] = recipeHandle;
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
