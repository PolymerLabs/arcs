// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

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
  }
  _addParticle(token, particle) {
    this._byToken[token] = this._byToken[token] || [];
    this._byToken[token].push(particle);
  }
  async generate(strategizer) {
    let findParticles = token => this._byToken[token] || [];
    var results = Recipe.over(strategizer.generated, new class extends RecipeWalker {
      onRecipe(recipe) {
        // TODO: according to design, the search strategy activates when the recipe is resolved
        // OR when the recipe is a terminal case (did not generate descendants from any other strategies).
        if (/*!recipe.isResolved() ||*/ !recipe.search || !recipe.search.unresolvedTokens.length) {
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
    }(RecipeWalker.Permuted), this);

    return {
      results,
      generate: null,
    };
  }
};
