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

  getResults(inputParams) {
    return inputParams.terminal.filter(result => !result.result.isResolved());
  }

  async generate(inputParams) {
    let self = this;
    let applicableHandles = null;
    return Recipe.over(this.getResults(inputParams), new class extends Walker {
      onHandle(recipe, handle) {
        if (handle.fate === 'create'
            || handle.id
            || handle.connections.length === 0
            || handle.name === 'descriptions') return;

        let counts = RecipeUtil.directionCounts(handle);

        if (applicableHandles === null)
          applicableHandles = self.findApplicableHandles(inputParams);

        let results = [];

        for (let [otherHandle, otherCounts] of applicableHandles) {
          if (otherHandle.recipe === recipe
              || otherCounts.in + counts.in === 0
              || otherCounts.out + counts.out === 0
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

            return 1;
          });
        }

        return results;
      }
    }(Walker.Independent), this);
  }

  findApplicableHandles(inputParams) {
    // We seek terminal unresolved recipes in an entire population.
    let candidates = new Set(inputParams.population.filter(result => !result.result.isResolved()));
    for (let result of inputParams.population) {
      for (let deriv of result.derivation) {
        if (deriv.parent && deriv.strategy !== this) candidates.delete(deriv.parent);
      }
    }
    for (let result of inputParams.generated) {
      // We don't know yet if recipes in the most recent generation are terminal.
      candidates.delete(result);
    }

    let handles = [];
    for (let candidate of candidates) {
      handles.push(...candidate.result.handles.filter(h => h.fate !== 'create'
          && !h.id
          && h.connections.length !== 0
          && h.name !== 'descriptions'));
    }

    return handles.map(handle => [handle, RecipeUtil.directionCounts(handle)]);
  }
}
