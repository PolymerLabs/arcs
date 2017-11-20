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

module.exports = class SearchTokensToParticles extends Strategy {
  constructor(arc) {
    super();
    // TODO: Recipes. Views?
    this._byToken = {};
    for (let particle of arc.context.particles) {
      let name = particle.name.toLowerCase();
      this._addParticle(name, particle);

      let verb = particle.primaryVerb;
      if (verb != name) {
        this._addParticle(verb, particle);
      }
    }

    let findParticles = token => this._byToken[token] || [];
    class Walker extends RecipeWalker {
      onRecipe(recipe) {
        if (!recipe.search || !recipe.search.unresolvedTokens.length) {
          return;
        }

        let specsByToken = {};
        for (let token of recipe.search.unresolvedTokens) {
          for (let spec of findParticles(token)) {
            // TODO: Skip particles that are already in the active recipe?
            specsByToken[token] = specsByToken[token] || [];
            specsByToken[token].push(spec)
          }
        }
        let resolvedTokens = Object.keys(specsByToken);
        if (resolvedTokens.length == 0) {
          return;
        }

        const flatten = (arr) => [].concat.apply([], arr);
        const product = (...sets) =>
          sets.reduce((acc, set) =>
            flatten(acc.map(x => set.map(y => [ ...x, y ]))),
            [[]]);
        let possibleCombinations = product.apply(null, Object.values(specsByToken).map(v => flatten(v)));

        return possibleCombinations.map(combination => {
          return recipe => {
            resolvedTokens.forEach(token => recipe.search.resolveToken(token));
            combination.forEach(spec => {
              let particle = recipe.newParticle(spec.name);
              particle.spec = spec;
            });
            return resolvedTokens.size;
          };
        });
      }
    };
    this._walker = new Walker(RecipeWalker.Permuted);
  }

  get walker() {
    return this._walker;
  }

  getResults(strategizer) {
    assert(strategizer);
    let generated = super.getResults(strategizer).filter(result => !result.result.isResolved());
    let terminal = strategizer.terminal;
    return [...generated, ...terminal];
  }

  _addParticle(token, particle) {
    this._byToken[token] = this._byToken[token] || [];
    this._byToken[token].push(particle);
  }
  async generate(strategizer) {
    return {
      results: Recipe.over(this.getResults(strategizer), this.walker, this),
      generate: null,
    };
  }
};
