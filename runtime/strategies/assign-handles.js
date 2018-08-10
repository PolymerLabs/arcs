// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

import {Strategy} from '../../strategizer/strategizer.js';
import {Walker} from '../recipe/walker.js';
import {Recipe} from '../recipe/recipe.js';
import {RecipeUtil} from '../recipe/recipe-util.js';
import {assert} from '../../platform/assert-web.js';

export class AssignHandles extends Strategy {
  constructor(arc) {
    super();
    this._arc = arc;
  }

  get arc() { return this._arc; }

  async generate(inputParams) {
    let self = this;

    return Recipe.over(this.getResults(inputParams), new class extends Walker {
      onHandle(recipe, handle) {
        if (!['?', 'use', 'copy', 'map'].includes(handle.fate)) {
          return;
        }

        if (handle.connections.length == 0) {
          return;
        }

        if (handle.id) {
          return;
        }

        if (!handle.type) {
          return;
        }

        // TODO: using the connection to retrieve type information is wrong.
        // Once validation of recipes generates type information on the handle
        // we should switch to using that instead.
        let counts = RecipeUtil.directionCounts(handle);
        if (counts.unknown > 0) {
          return;
        }

        let score = this._getScore(counts, handle.tags);

        if (counts.out > 0 && handle.fate == 'map') {
          return;
        }
        let stores = self.getMappableStores(handle.fate, handle.type, handle.tags, counts);
        if (handle.fate != '?' && stores.size < 2) {
          // These handles are mapped by resolve-recipe strategy.
          return;
        }

        let responses = [...stores.keys()].map(store =>
          ((recipe, clonedHandle) => {
            assert(store.id);
            if (recipe.handles.find(handle => handle.id == store.id)) {
              // TODO: Why don't we link the handle connections to the existingHandle?
              return 0;
            }

            clonedHandle.mapToStorage(store);
            if (clonedHandle.fate == '?') {
              clonedHandle.fate = stores.get(store);
            } else {
              assert(clonedHandle.fate, stores.get.store);
            }
            return score;
          }));

        return responses;
      }

      _getScore(counts, tags) {
        let score = -1;
        if (counts.in == 0 || counts.out == 0) {
          if (counts.out == 0) {
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

    }(Walker.Permuted), this);
  }

  getMappableStores(fate, type, tags, counts) {
    let stores = new Map();
    if (fate == 'use' || fate == '?') {
      let subtype = counts.out == 0;
      // TODO: arc.findStoresByType doesn't use `subtype`. Shall it be removed?
      this.arc.findStoresByType(type, {tags, subtype}).forEach(store => stores.set(store, 'use'));
    }
    if (fate == 'map' || fate == 'copy' || fate == '?') {
      this.arc.context.findStoreByType(type, {tags, subtype: true}).forEach(
          store => stores.set(store, fate == '?' ? (counts.out > 0 ? 'copy' : 'map') : fate));
    }
    return stores;
  }
}
