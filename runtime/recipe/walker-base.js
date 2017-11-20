// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

import {Strategizer} = '../../strategizer/strategizer.js';
import Recipe from './recipe.js';
import assert from 'assert';

class WalkerBase extends Strategizer.Walker {
  constructor(tactic) {
    super();
    assert(tactic);
    this.tactic = tactic;
  }

  _runUpdateList(recipe, updateList) {
    var newRecipes = [];
    if (updateList.length) {
      switch (this.tactic) {
        case WalkerBase.Permuted:
          var permutations = [[]];
          updateList.forEach(({continuation, context}) => {
            var newResults = [];
            if (typeof continuation == 'function')
              continuation = [continuation];
            continuation.forEach(f => {
              permutations.forEach(p => {
                var newP = p.slice();
                newP.push({f, context});
                newResults.push(newP);
              });
            });
            permutations = newResults;
          });

          for (var permutation of permutations) {
            var cloneMap = new Map();
            var newRecipe = recipe.clone(cloneMap);
            var score = 0;
            permutation = permutation.filter(p => p.f !== null);
            if (permutation.length == 0)
              continue;
            permutation.forEach(({f, context}) => {
              score += f(newRecipe, cloneMap.get(context))
            });

            newRecipes.push({recipe: newRecipe, score});
          }
          break;
        case WalkerBase.Independent:
          updateList.forEach(({continuation, context}) => {
            if (typeof continuation == 'function')
              continuation = [continuation];
            continuation.forEach(f => {
              if (f == null)
                f = () => 0;
              var cloneMap = new Map();
              var newRecipe = recipe.clone(cloneMap);
              var score = f(newRecipe, cloneMap.get(context));
              newRecipes.push({recipe: newRecipe, score});
            });
          });
          break;
        default:
          throw `${this.tactic} not supported`;
      }
    }

    // commit phase - output results.

    for (var newRecipe of newRecipes) {
      var result = this.createDescendant(newRecipe.recipe, newRecipe.score);
    }
  }

  createDescendant(recipe, score) {
    let valid = recipe.normalize();
    //if (!valid) debugger;
    let hash = valid ? recipe.digest() : null
    super.createDescendant(recipe, score, hash, valid);
  }

  isEmptyResult(result) {
    if (!result)
      return true;

    if (result.constructor == Array && result.length <= 0)
      return true;

      assert(typeof result == 'function' || result.length);

    return false;
  }
}

WalkerBase.Permuted = "permuted";
WalkerBase.Independent = "independent";

export default WalkerBase;
