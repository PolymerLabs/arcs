// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

let {Strategy} = require('../../strategizer/strategizer.js');

class InitPopulation extends Strategy {
  constructor(context) {
    super();
    this._recipes = [];
    for (let recipe of (context.recipes || [])) {
      recipe = recipe.clone();
      if (!recipe.normalize()) {
        console.warn('could not normalize a context recipe');
      } else {
        this._recipes.push(recipe);
      }
    }
  }
  async generate(strategizer) {
    if (strategizer.generation != 0) {
      return { results: [], generate: null };
    }

    let results = this._recipes.map(recipe => ({
      result: recipe,
      score: 1,
      derivation: [{strategy: this, parent: undefined}],
      hash: recipe.digest(),
    }));

    return {
      results: results,
      generate: null,
    };
  }
}

module.exports = InitPopulation;
