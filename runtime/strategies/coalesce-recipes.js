// Copyright (c) 2018 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

import {Strategy} from '../../strategizer/strategizer.js';
import {Recipe} from '../recipe/recipe.js';
import {RecipeUtil} from '../recipe/recipe-util.js';
import {Walker} from '../recipe/walker.js';
import {Handle} from '../recipe/handle.js';

// This strategy coalesces unresolved terminal recipes (i.e. those that cannot
// be modified by any strategy apart from this one) by finding unresolved
// use/map/copy handles from 2 recipes and replacing them with a single create
// handle that allows to satisfy all constraints.
export class CoalesceRecipes extends Strategy {

  constructor(arc) {
    super();
    this._applicableHandles = new Promise(async resolve => {
      let handles = [];
      for (let candidate of await arc.recipeIndex.recipes) {
        handles.push(...candidate.handles.filter(h =>
            (h.fate === 'use' || h.fate === '?')
            && !h.id
            && h.connections.length !== 0
            && h.name !== 'descriptions'));
      }
      resolve(handles.map(handle => [handle, RecipeUtil.directionCounts(handle)]));
    });
  }

  getResults(inputParams) {
    return inputParams.terminal.filter(result => !result.result.isResolved());
  }

  async generate(inputParams) {
    let applicableHandles = await this._applicableHandles;
    return Recipe.over(this.getResults(inputParams), new class extends Walker {
      onHandle(recipe, handle) {
        if (handle.fate === 'create'
            || handle.id
            || handle.connections.length === 0
            || handle.name === 'descriptions') return;

        let counts = RecipeUtil.directionCounts(handle);
        let particleNames = handle.connections.map(conn => conn.particle.name);

        let results = [];

        for (let [otherHandle, otherCounts] of applicableHandles) {
          let otherParticleNames = otherHandle.connections.map(conn => conn.particle.name);
          if (otherCounts.in + counts.in === 0
              || otherCounts.out + counts.out === 0
              // If we're connections the same sets of particles, that's probably not OK.
              || new Set([...particleNames, ...otherParticleNames]).size
                  === particleNames.length
              || recipe.particles.length + otherHandle.recipe.particles.length > 10
              || !Handle.effectiveType(handle._mappedType,
                  [...handle.connections, ...otherHandle.connections])) {
            continue;
          }

          results.push((recipe, handle) => {
            let {cloneMap} = otherHandle.recipe.mergeInto(recipe);
            let mergedOtherHandle = cloneMap.get(otherHandle);
            if (!mergedOtherHandle) return null;
            while (mergedOtherHandle.connections.length > 0) {
              let [connection] = mergedOtherHandle.connections;
              connection.disconnectHandle();
              connection.connectToHandle(handle);
            }
            recipe.removeHandle(mergedOtherHandle);
            handle.fate = 'create';

            // Clear verbs and recipe name after coalescing two recipes.
            recipe.verbs.splice(0);
            recipe.name = '';

            return 1;
          });
        }

        return results;
      }
    }(Walker.Independent), this);
  }
}
