

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
      this._byToken[name] = this._byToken[name] || [];
      this._byToken[name].push(particle);
    }
  }
  async generate(strategizer) {
    let findParticles = token => this._byToken[token] || [];
    var results = Recipe.over(strategizer.generated, new class extends RecipeWalker {
      onRecipe(recipe) {
        if (/*!recipe.isResolved() ||*/ !recipe.search || !recipe.search.unresolvedTokens.length) {
          return;
        }

        let specByToken = new Map();
        for (let token of recipe.search.unresolvedTokens) {
          for (let spec of findParticles(token)) {
            // TODO: Skip particles that are already in the active recipe?
            specByToken.set(token, spec);
          }
        }
        if (specByToken.size == 0) {
          return;
        }

        return recipe => {
          specByToken.forEach((spec, token) => {
            recipe.search.resolveToken(token);
            let particle = recipe.newParticle(spec.name);
            particle.spec = spec;
          });
          return specByToken.size;
        };

      }
    }(RecipeWalker.Permuted), this);

    return {
      results,
      generate: null,
    };
  }
};
