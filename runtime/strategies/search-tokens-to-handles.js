// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

import {assert} from '../../platform/assert-web.js';
import {Strategy} from '../../strategizer/strategizer.js';
import {Recipe} from '../recipe/recipe.js';
import {RecipeUtil} from '../recipe/recipe-util.js';
import {Walker} from '../recipe/walker.js';

export class SearchTokensToHandles extends Strategy {
  constructor(arc) {
    super();
    this._arc = arc;
  }

  async generate(inputParams) {
    let arc = this._arc;
    // Finds stores matching the provided token and compatible with the provided handle's type,
    // which are not already mapped into the provided handle's recipe
    let findMatchingStores = (token, handle) => {
      const counts = RecipeUtil.directionCounts(handle);
      let stores = arc.findStoresByType(handle.type, {tags: [`${token}`], subtype: counts.out == 0});
      let fate = 'use';
      if (stores.length == 0) {
        stores = arc._context.findStoreByType(handle.type, {tags: [`${token}`], subtype: counts.out == 0});
        fate = counts.out == 0 ? 'map' : 'copy';
      }
      stores = stores.filter(store => !handle.recipe.handles.find(handle => handle.id == store.id));
      return stores.map(store => { return {store, fate, token}; });
    };

    return Recipe.over(this.getResults(inputParams), new class extends Walker {
      onHandle(recipe, handle) {
        if (!recipe.search || recipe.search.unresolvedTokens.length == 0) {
          return;
        }
        if (handle.isResolved() || handle.connections.length == 0) {
          return;
        }

        let possibleMatches = [];
        for (let token of recipe.search.unresolvedTokens) {
          possibleMatches.push(...findMatchingStores(token, handle));
        }
        if (possibleMatches.length == 0) {
          return;
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
