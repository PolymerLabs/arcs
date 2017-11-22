// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

import {Strategy} from '../../strategizer/strategizer.js';
import Recipe from '../recipe/recipe.js';
import RecipeWalker from '../recipe/walker.js';

export default class MatchParticleByVerb extends Strategy {
  constructor(arc) {
    super();
    this._arc = arc;
  }

  async generate(strategizer) {
    var arc = this._arc;
    var results = Recipe.over(this.getResults(strategizer), new class extends RecipeWalker {
      onParticle(recipe, particle) {
        if (particle.name) {
          // Particle already has explicit name.
          return;
        }

        let particleSpecs = arc.context.findParticlesByVerb(particle.primaryVerb)
            .filter(spec => !arc.pec.slotComposer || spec.matchAffordance(arc.pec.slotComposer.affordance))

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
