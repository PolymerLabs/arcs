// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

const {Strategy} = require('../../strategizer/strategizer.js');
const Recipe = require('../recipe/recipe.js');
const assert = require('../../platform/assert-web.js');

module.exports = class InitSearch extends Strategy {
  constructor(arc) {
    super();
    // TODO: Figure out where this should really come from.
    this._search = arc.search;
  }
  async generate(strategizer) {
    if (this._search == null || strategizer.generation != 0) {
      return {
        results: [],
        generate: null,
      };
    }

    let recipe = new Recipe();
    recipe.setSearchPhrase(this._search);
    assert(recipe.normalize());
    assert(!recipe.isResolved())

    return {
      results: [{
        result: recipe,
        score: 0,
        derivation: [{strategy: this, parent: undefined}],
        hash: recipe.digest(),
      }],
      generate: null,
    };
  }
};
