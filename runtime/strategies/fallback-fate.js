
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

import {assert} from '../../platform/assert-web.js';
import {Strategy} from '../../strategizer/strategizer.js';
import {Recipe} from '../recipe/recipe.js';
import {Walker} from '../recipe/walker.js';

export class FallbackFate extends Strategy {
  getResults(inputParams) {
    assert(inputParams);
    let generated = inputParams.generated.filter(result => !result.result.isResolved());
    let terminal = inputParams.terminal;
    return [...generated, ...terminal];
  }

  async generate(inputParams) {
    return Recipe.over(this.getResults(inputParams), new class extends Walker {
      onHandle(recipe, handle) {
        // Only apply this strategy only to user query based recipes with resolved tokens.
        if (!recipe.search || (recipe.search.resolvedTokens.length == 0)) {
          return;
        }

        // Only apply to handles whose fate is set, but wasn't explicitly defined in the recipe.
        if (handle.isResolved() || handle.fate == '?' || handle.originalFate != '?') {
          return;
        }

        let hasOutConns = handle.connections.some(hc => hc.isOutput);
        let newFate = hasOutConns ? 'copy' : 'map';
        if (handle.fate == newFate) {
          return;
        }

        return (recipe, clonedHandle) => {
          clonedHandle.fate = newFate;
          return 0;
        };
      }
    }(Walker.Permuted), this);
  }
}
