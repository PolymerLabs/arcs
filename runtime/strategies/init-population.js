// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

import {Strategy} from '../../strategizer/strategizer.js';

export default class InitPopulation extends Strategy {
  constructor(arc) {
    super();
    this._recipes = [];
    for (let recipe of (arc.context.recipes || [])) {
      // Filter out recipes containing particles that don't support the current affordance.
      if (arc.pec.slotComposer) {
        if (recipe.particles.find(p => p.spec && !p.spec.matchAffordance(arc.pec.slotComposer.affordance)) !== undefined) {
          continue;
        }
      }
      recipe = recipe.clone();
      if (!recipe.normalize()) {
        console.warn('could not normalize a context recipe');
      } else {
        this._recipes.push(recipe);
      }
    }
    this._loadedParticles = new Set(arc.loadedParticles().map(spec => spec.implFile));
  }
  async generate(strategizer) {
    if (strategizer.generation != 0) {
      return { results: [], generate: null };
    }
    let results = this._recipes.map(recipe => ({
      result: recipe,
      score: 1 - recipe.particles.filter(particle => particle.spec && this._loadedParticles.has(particle.spec.implFile)).length,
      derivation: [{strategy: this, parent: undefined}],
      hash: recipe.digest(),
      valid: Object.isFrozen(recipe),
    }));

    return {
      results: results,
      generate: null,
    };
  }
}
