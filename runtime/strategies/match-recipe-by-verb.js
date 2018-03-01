// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

import {Strategy} from '../../strategizer/strategizer.js';
import Recipe from '../recipe/recipe.js';
import RecipeWalker from '../recipe/walker.js';

export default class MatchRecipeByVerb extends Strategy {
  constructor(arc) {
    super();
    this._arc = arc;
  }

  async generate(strategizer) {
    let arc = this._arc;
    let results = Recipe.over(this.getResults(strategizer), new class extends RecipeWalker {
      onParticle(recipe, particle) {
        if (particle.name) {
          // Particle already has explicit name.
          return;
        }

        if (particle.allConnections().length > 0)
          return;

        if (Object.keys(particle.consumedSlotConnections).length > 0)
          return;

        let recipes = arc.context.findRecipesByVerb(particle.primaryVerb);

        return recipes.map(recipe => {
          return (outputRecipe, particle) => {
            recipe.mergeInto(outputRecipe);
            particle.remove();

            return 1;
          };
        });
      }
    }(RecipeWalker.Permuted), this);

    return {results, generate: null};
  }
};
