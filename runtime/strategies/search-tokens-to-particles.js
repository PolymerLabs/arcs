

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
  _findParticles(token) {
    return this._byToken(token) || [];
  }
  async generate(strategizer) {
    let findParticles = token => this._byToken[token] || [];
    var results = Recipe.over(strategizer.generated, new class extends RecipeWalker {
      onRecipe(recipe) {
        if (!recipe.isResolved() || recipe.tokens.length == 0) {
          return;
        }

        let results = [];
        for (let token of recipe.tokens) {
          for (let spec of findParticles(token)) {
            // TODO: Skip particles that are already in the active recipe?
            results.push(recipe => {
              recipe.tokens = recipe.tokens.filter(t => t != token);
              let particle = recipe.newParticle(spec.name);
              particle.spec = spec;
              return 1;
            });
          }
        }
        return results;
      }
    }(RecipeWalker.Permuted), this);

    return {
      results,
      generate: null,
    };
  }
};
