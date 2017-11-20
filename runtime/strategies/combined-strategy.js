// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

let assert = require('../../platform/assert-web.js');
let {Strategy} = require('../../strategizer/strategizer.js');
let Recipe = require('../recipe/recipe.js');
let RecipeWalker = require('../recipe/walker.js');

module.exports = class CombinedStrategy extends Strategy {
  constructor(strategies) {
    super();
    assert(strategies.length > 1, 'Strategies must contain at least 2 elements.');
    this._strategies = strategies;
    this._strategies.forEach(strategy => assert(strategy.walker));
    assert(this._strategies[0].getResults);
  }
  _getLeaves(results) {
    // Only use leaf recipes.
    let recipeByParent = new Map();
    let resultsList = [...results.values()];
    resultsList.forEach(r => {
      r.derivation.forEach(d => {
        if (d.parent) {
          recipeByParent.set(d.parent, r);
        }
      });
    });
    return resultsList.filter(r => !recipeByParent.has(r));
  }
  async generate(strategizer) {
    let results = this._strategies[0].getResults(strategizer);
    let totalResults = new Map();
    for (let strategy of this._strategies) {
      results = Recipe.over(results, strategy.walker, strategy);
      results = await Promise.all(results.map(async result => {
        if (result.hash) {
          result.hash = await result.hash;
        }
        if (!totalResults.has(result.hash)) {
          // TODO: deduping of results is already done in strategizer.
          // It should dedup the intermeditate derivations as well.
          totalResults.set(result.hash, result);
        }
        return result;
      }));
      results = this._getLeaves(totalResults);
    }

    return { results, generate: null };
  }
};
