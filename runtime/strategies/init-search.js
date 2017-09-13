// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

const {Strategy} = require('../../strategizer/strategizer.js');
const Recipe = require('../recipe/recipe.js');
const assert = require('assert');

module.exports = class InitSearch extends Strategy {
  constructor(arc) {
    super();
    this._search = arc._search;
  }
  async generate(strategizer) {
    if (this._search == null || strategizer.generation != 0) {
      return {
        results: [],
        generate: null,
      };
    }

    let recipe = new Recipe();
    recipe.search = this._search;
    recipe.tokens = this._search.toLowerCase().split(/[^a-z0-9]/g);
    assert(recipe.normalize());

    console.log('wat');
    return {
      results: [{
        result: recipe,
        score: 1,
        derivation: [{strategy: this, parent: undefined}],
        hash: recipe.digest(),
      }],
      generate: null,
    };
  }
};
