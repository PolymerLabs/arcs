
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

let assert = require('assert');
let {Strategy} = require('../../strategizer/strategizer.js');
let Recipe = require('../recipe/recipe.js');
let RecipeWalker = require('../recipe/walker.js');

class FallbackFate extends Strategy {
  async generate(strategizer) {
    assert(strategizer);
    let generated = strategizer.generated.filter(result => !result.result.isResolved());
    let terminal = strategizer.terminal;
    var results = Recipe.over([...generated, ...terminal], new class extends RecipeWalker {
      onView(recipe, view) {
        // Only apply this strategy to user query based recipes.
        if (!recipe.search) {
          return;
        }

        // Only apply to views whose fate is set, but wasn't explicitly defined in the recipe.
        if (view.isResolved() || view.fate == "?" || view.originalFate != "?") {
          return;
        }

        return (recipe, clonedView) => {
          let hasOutConns = clonedView.connections.some(vc => vc.isOutput);
          clonedView.fate = hasOutConns ? "copy" : "map";
          return 0;
        };
      }
    }(RecipeWalker.Permuted), this);

    return { results, generate: null };
  }
}

module.exports = FallbackFate;
