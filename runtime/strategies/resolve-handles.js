// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

import {Strategy} from '../../strategizer/strategizer.js';
import RecipeWalker from '../recipe/walker.js';
import Recipe from '../recipe/recipe.js';
import RecipeUtil from '../recipe/recipe-util.js';
import assert from '../../platform/assert-web.js';

export default class ResolveHandles extends Strategy {
  constructor(arc) {
    super();
    this._arc = arc;
  }

  async generate(strategizer) {
    let arc = this._arc;
    let results = Recipe.over(this.getResults(strategizer), new class extends RecipeWalker {
      onView(recipe, handle) {
        if (handle.connections.length == 0 || handle.id || (!handle.type) || (!handle.fate))
          return;

        const counts = RecipeUtil.directionCounts(handle);

        let mappable;

        switch (handle.fate) {
          case 'use':
            mappable = arc.findHandlesByType(handle.type, {tags: handle.tags, subtype: counts.out == 0});
            break;
          case 'map':
          case 'copy':
            mappable = arc.context.findHandlesByType(handle.type, {tags: handle.tags, subtype: true});
            break;
          case 'create':
          case '?':
            mappable = [];
            break;
          default:
            assert(false, `unexpected fate ${handle.fate}`);
        }

        mappable = mappable.filter(incomingHandle => {
          for (let existingHandle of recipe.handles)
            if (incomingHandle.id == existingHandle.id)
              return false;
          return true;
        });

        if (mappable.length == 1) {
          return (recipe, handle) => {
            handle.mapToView(mappable[0]);
          };            
        }
      }
    }(RecipeWalker.Permuted), this);

    return {results, generate: null};
  }
}