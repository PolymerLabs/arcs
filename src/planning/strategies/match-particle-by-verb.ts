// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

import {Arc} from '../../runtime/arc.js';
import {Recipe} from '../../runtime/recipe/recipe.js';
import {StrategizerWalker, Strategy} from '../strategizer.js';

export class MatchParticleByVerb extends Strategy {

  async generate(inputParams) {
    const arc = this.arc;
    return StrategizerWalker.over(this.getResults(inputParams), new class extends StrategizerWalker {
      onParticle(recipe, particle) {
        if (particle.name) {
          // Particle already has explicit name.
          return undefined;
        }

        const modality = arc.modality.intersection(recipe.modality);
        const particleSpecs = arc.context.findParticlesByVerb(particle.primaryVerb)
              .filter(spec => spec.isCompatible(modality));

        return particleSpecs.map(spec => {
          return (recipe, particle) => {
            const score = 1;

            particle.name = spec.name;
            particle.spec = spec;

            return score;
          };
        });
      }
    }(StrategizerWalker.Permuted), this);
  }
}
