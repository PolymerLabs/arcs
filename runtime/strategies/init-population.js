// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

import {Strategy} from '../../strategizer/strategizer.js';

export class InitPopulation extends Strategy {
  constructor(arc) {
    super();
    this._arc = arc;
    this._loadedParticles = new Set(this._arc.loadedParticles().map(spec => spec.implFile));
  }
  async generate({generation}) {
    if (generation != 0) {
      return [];
    }

    await this._arc.recipeIndex.ready;
    return this._arc.recipeIndex.recipes.map(recipe => ({
      result: recipe,
      score: 1 - recipe.particles.filter(particle => particle.spec && this._loadedParticles.has(particle.spec.implFile)).length,
      derivation: [{strategy: this, parent: undefined}],
      hash: recipe.digest(),
      valid: Object.isFrozen(recipe),
    }));
  }
}
