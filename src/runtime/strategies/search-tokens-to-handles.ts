// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

import {Strategizer, Strategy} from '../../planning/strategizer.js';
import {Recipe} from '../recipe/recipe.js';
import {RecipeUtil} from '../recipe/recipe-util.js';
import {Walker} from '../recipe/walker.js';
import {Arc} from '../arc.js';

export class SearchTokensToHandles extends Strategy {

  async generate(inputParams) {
    const arc = this.arc;
    // Finds stores matching the provided token and compatible with the provided handle's type,
    // which are not already mapped into the provided handle's recipe
    const findMatchingStores = (token, handle) => {
      const counts = RecipeUtil.directionCounts(handle);
      let stores = arc.findStoresByType(handle.type, {tags: [`${token}`], subtype: counts.out === 0});
      let fate = 'use';
      if (stores.length === 0) {
        stores = arc.context.findStoreByType(handle.type, {tags: [`${token}`], subtype: counts.out === 0});
        fate = counts.out === 0 ? 'map' : 'copy';
      }
      stores = stores.filter(store => !handle.recipe.handles.find(handle => handle.id === store.id));
      return stores.map(store => ({store, fate, token}));
    };

    return Strategizer.over(this.getResults(inputParams), new class extends Walker {
      onHandle(recipe, handle) {
        if (!recipe.search || recipe.search.unresolvedTokens.length === 0) {
          return undefined;
        }
        if (handle.isResolved() || handle.connections.length === 0) {
          return undefined;
        }

        const possibleMatches = [];
        for (const token of recipe.search.unresolvedTokens) {
          possibleMatches.push(...findMatchingStores(token, handle));
        }
        if (possibleMatches.length === 0) {
          return undefined;
        }
        return possibleMatches.map(match => {
          return (recipe, handle) => {
            handle.fate = match.fate;
            handle.mapToStorage(match.store);
            recipe.search.resolveToken(match.token);
          };
        });
      }
    }(Walker.Permuted), this);
  }
}
