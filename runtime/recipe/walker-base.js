// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

import {Strategizer} from '../../strategizer/strategizer.js';
import {assert} from '../../platform/assert-web.js';

/**
 * Walkers traverse an object, calling methods based on the
 * features encountered on that object. For example, a RecipeWalker
 * takes a list of recipes and calls methods when:
 *  - a new recipe is encountered
 *  - a handle is found inside a recipe
 *  - a particle is found inside a recipe
 *  - etc..
 * 
 * Each of these methods can return a list of updates:
 *   [(recipe, encountered_thing) => new_recipe]
 *
 * The walker then does something with the updates depending on the
 * tactic selected.
 * 
 * If the tactic is "Permuted", then an output will be generated
 * for every combination of 1 element drawn from each update list.
 * For example, if 3 methods return [a,b], [c,d,e], and [f] respectively
 * then "Permuted" will cause 6 outputs to be generated: [acf, adf, aef, bcf, bdf, bef]
 * 
 * If the tactic is "Independent", an output will be generated for each
 * update, regardless of the list the update is in. For example,
 * if 3 methods return [a,b], [c,d,e], and [f] respectively,
 * then "Independent" will cause 6 outputs to be generated: [a,b,c,d,e,f]
 */
export class WalkerBase extends Strategizer.Walker {
  constructor(tactic) {
    super();
    assert(tactic);
    this.tactic = tactic;
  }

  _runUpdateList(recipe, updateList) {
    let newRecipes = [];
    if (updateList.length) {
      switch (this.tactic) {
        case WalkerBase.Permuted: {
          let permutations = [[]];
          updateList.forEach(({continuation, context}) => {
            let newResults = [];
            if (typeof continuation == 'function')
              continuation = [continuation];
            continuation.forEach(f => {
              permutations.forEach(p => {
                let newP = p.slice();
                newP.push({f, context});
                newResults.push(newP);
              });
            });
            permutations = newResults;
          });

          for (let permutation of permutations) {
            let cloneMap = new Map();
            let newRecipe = recipe.clone(cloneMap);
            let score = 0;
            permutation = permutation.filter(p => p.f !== null);
            if (permutation.length == 0)
              continue;
            permutation.forEach(({f, context}) => {
              score += f(newRecipe, cloneMap.get(context));
            });

            newRecipes.push({recipe: newRecipe, score});
          }
          break;
        }
        case WalkerBase.Independent:
          updateList.forEach(({continuation, context}) => {
            if (typeof continuation == 'function')
              continuation = [continuation];
            continuation.forEach(f => {
              if (f == null)
                f = () => 0;
              let cloneMap = new Map();
              let newRecipe = recipe.clone(cloneMap);
              let score = f(newRecipe, cloneMap.get(context));
              newRecipes.push({recipe: newRecipe, score});
            });
          });
          break;
        default:
          throw `${this.tactic} not supported`;
      }
    }

    // commit phase - output results.

    for (let newRecipe of newRecipes) {
      let result = this.createDescendant(newRecipe.recipe, newRecipe.score);
    }
  }

  createDescendant(recipe, score) {
    let valid = recipe.normalize();
    //if (!valid) debugger;
    let hash = valid ? recipe.digest() : null;
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

WalkerBase.Permuted = 'permuted';
WalkerBase.Independent = 'independent';
