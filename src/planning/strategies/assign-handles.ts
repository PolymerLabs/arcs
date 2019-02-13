// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

import {assert} from '../../platform/assert-web.js';
import {RecipeUtil} from '../../runtime/recipe/recipe-util.js';
import {Recipe} from '../../runtime/recipe/recipe.js';
import {StorageProviderBase} from '../../runtime/storage/storage-provider-base.js';
import {StrategizerWalker, Strategy} from '../strategizer.js';

export class AssignHandles extends Strategy {
  async generate(inputParams) {
    const self = this;

    return StrategizerWalker.over(this.getResults(inputParams), new class extends StrategizerWalker {
      onHandle(recipe, handle) {
        if (!['?', 'use', 'copy', 'map'].includes(handle.fate)) {
          return undefined;
        }

        if (handle.connections.length === 0) {
          return undefined;
        }

        if (handle.id) {
          return undefined;
        }

        if (!handle.type) {
          return undefined;
        }

        // TODO: using the connection to retrieve type information is wrong.
        // Once validation of recipes generates type information on the handle
        // we should switch to using that instead.
        const counts = RecipeUtil.directionCounts(handle);
        if (counts.unknown > 0) {
          return undefined;
        }

        const score = this._getScore(counts, handle.tags);

        if (counts.out > 0 && handle.fate === 'map') {
          return undefined;
        }
        const stores = self.getMappableStores(handle.fate, handle.type, handle.tags, counts);
        if (handle.fate !== '?' && stores.size < 2) {
          // These handles are mapped by resolve-recipe strategy.
          return undefined;
        }

        const responses = [...stores.keys()].map(store =>
          ((recipe, clonedHandle) => {
            assert(store.id);
            if (recipe.findHandleByID(store.id)) {
              // TODO: Why don't we link the handle connections to the existingHandle?
              return 0;
            }

            clonedHandle.mapToStorage(store);
            if (clonedHandle.fate === '?') {
              clonedHandle.fate = stores.get(store);
            } else {
              assert(clonedHandle.fate, stores.get(store));
            }
            return score;
          }));

        return responses;
      }

      _getScore(counts, tags) {
        let score = -1;
        if (counts.in === 0 || counts.out === 0) {
          if (counts.out === 0) {
            score = 1;
          } else {
            score = 0;
          }
        }
        // TODO: Why is score negative, where there are both - in and out?

        if (tags.length > 0) {
          score += 4;
        }
        return score;
      }

    }(StrategizerWalker.Permuted), this);
  }

  getMappableStores(fate, type, tags, counts): Map<StorageProviderBase, string> {
    const stores: Map<StorageProviderBase, string> = new Map();

    if (fate === 'use' || fate === '?') {
      const subtype = counts.out === 0;
      // TODO: arc.findStoresByType doesn't use `subtype`. Shall it be removed?
      this.arc.findStoresByType(type, {tags, subtype}).forEach(store => stores.set(store, 'use'));
    }
    if (fate === 'map' || fate === 'copy' || fate === '?') {
      this.arc.context.findStoreByType(type, {tags, subtype: true}).forEach(
          store => stores.set(store, fate === '?' ? (counts.out > 0 ? 'copy' : 'map') : fate));
    }
    return stores;
  }
}
