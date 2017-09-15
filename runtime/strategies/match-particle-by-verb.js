// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

let {Strategy} = require('../../strategizer/strategizer.js');
let Recipe = require('../recipe/recipe.js');
let RecipeWalker = require('../recipe/walker.js');

module.exports = class MatchParticleByVerb extends Strategy {
  constructor(arc) {
    super();
    this._arc = arc;
  }
  async generate(strategizer) {
    var arc = this._arc;
    var results = Recipe.over(strategizer.generated, new class extends RecipeWalker {
      onParticle(recipe, particle) {
        if (particle.name) {
          // Particle already has explicit name.
          return;
        }

        // Find particles by verb and filter by affordance, if applicable.
        let particleSpecs = arc.context.findParticlesByVerb(particle.primaryVerb)
            .filter(spec => !arc.pec.slotComposer || spec.matchAffordance(arc.pec.slotComposer.affordance));

        // TODO: match particle view and slot connections.

        return particleSpecs.map(spec => {
          return (recipe, particle) => {
            let score = 1;
            particle.name = spec.name;
            particle.spec = spec;
            return score;
          };
        });
      }
    }(RecipeWalker.Permuted), this);

    return { results, generate: null };
  }
};
