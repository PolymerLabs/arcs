// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

var Strategizer = require('../../strategizer/strategizer.js').Strategizer;
var Recipe = require('./recipe.js');
var assert = require('assert');

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
            permutation.forEach(({f, context}) => score += f(newRecipe, cloneMap.get(context)));
            newRecipes.push({recipe: newRecipe, score});
          }
          break;
        case WalkerBase.Independent:
          updateList.forEach(({continuation, context}) => {
            if (typeof continuation == 'function')
              continuation = [continuation];
            continuation.forEach(f => {
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
    recipe.normalize();
    super.createDescendant(recipe, score, recipe.digest());
  }

  isEmptyResult(result) {
    if (!result)
      return true;

    if (result.constructor == Array && result.length <= 0)
      return true;

    return false;
  }
}

WalkerBase.Permuted = "permuted";
WalkerBase.Independent = "independent";

module.exports = WalkerBase;
