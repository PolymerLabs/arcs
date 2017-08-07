
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

let {Strategy} = require('../../strategizer/strategizer.js');
let Recipe = require('../recipe/recipe.js');
let RecipeWalker = require('../recipe/walker.js');

class ResolveParticleByName extends Strategy {
  constructor(loader, context) {
    super();
    this._loader = loader;
    this._particles = {};
    for (let particle of (context.particles || [])) {
      let particles = this._particles[particle.name];
      if (!particles) {
        particles = this._particles[particle.name] = [];
      }
      particles.push(particle);
    }
    this._loadedParticles = context.arc.loadedParticles().map(spec => spec.implFile);
  }

  async generate(strategizer) {
    let find = name => {
      let particles = this._particles[name] || [];
      if (this._loader) {
        let particle = this._loader.loadParticleSpec(name, true);
        if (particle) {
          particles = [...particles, particle];
        }
      }
      return particles;
    };
    var loadedParticles = this._loadedParticles;
    var results = Recipe.over(strategizer.generated, new class extends RecipeWalker {
      onParticle(recipe, particle) {
        let particles = find(particle.name);
        return particles.map(spec => {
          var score = 1 / particles.length;
          if (loadedParticles.includes(spec.implFile))
            score = -1;
          return (recipe, particle) => {particle.spec = spec; return score};
        });
      }
    }(RecipeWalker.Permuted), this);

    return { results, generate: null };
  }
}

module.exports = ResolveParticleByName;
