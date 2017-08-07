// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

let {Strategy, Strategizer} = require('../strategizer/strategizer.js');
var assert = require("assert");
let oldRecipe = require('./recipe.js');
let Recipe = require('./recipe/recipe.js');
let RecipeUtil = require('./recipe/recipe-util.js');
let RecipeWalker = require('./recipe/walker.js');
let ConvertConstraintsToConnections = require('./strategies/convert-constraints-to-connections.js');
let AssignRemoteViews = require('./strategies/assign-remote-views.js');
let AssignViewsByTagAndType = require('./strategies/assign-views-by-tag-and-type.js');
let Manifest = require('./manifest.js');


class InitPopulation extends Strategy {
  constructor(context) {
    super();
    this._recipes = [];
    for (let recipe of (context.recipes || [])) {
      recipe = recipe.clone();
      if (!recipe.normalize()) {
        console.warn('could not normalize a context recipe');
      } else {
        this._recipes.push(recipe);
      }
    }
  }
  async generate(strategizer) {
    if (strategizer.generation != 0) {
      return { results: [], generate: null };
    }

    let results = this._recipes.map(recipe => ({
      result: recipe,
      score: 1,
      derivation: [{strategy: this, parent: undefined}],
      hash: recipe.digest(),
    }));

    return {
      results: results,
      generate: null,
    };
  }
}

// TODO: remove loader.
class ResolveParticleByName extends Strategy {
  constructor(context, loader) {
    super();
    this._loader = loader;
    this._particles = {};
    for (let particle in (context.particles || [])) {
      let particles = this._particles[particle.name];
      if (!particles) {
        particles = this._particles[particle.name] = [];
      }
      particles.push(particle);
    }
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
    var results = Recipe.over(strategizer.generated, new class extends RecipeWalker {
      onParticle(recipe, particle) {
        let particles = find(particle.name);
        return particles.map(spec => {
          return (recipe, particle) => {particle.spec = spec; return 1 / particles.length};
        });
      }
    }(RecipeWalker.Permuted), this);

    return { results, generate: null };
  }
}

class CreateViews extends Strategy {
  // TODO: move generation to use an async generator.
  async generate(strategizer) {
    var results = Recipe.over(strategizer.generated, new class extends RecipeWalker {
      onView(recipe, view) {
        var counts = RecipeUtil.directionCounts(view);

        var score = 1;
        if (counts.in == 0 || counts.out == 0) {
          if (counts.unknown > 0)
            return;
          if (counts.in == 0)
            score = -1;
          else
            score = 0;
        }

        if (!view.id && !view.create) {
          return (recipe, view) => {view.create = true; return score}
        }
      }
    }(RecipeWalker.Permuted), this);

    return { results, generate: null };
  }
}

class MatchConsumedSlots extends Strategy {
  async generate(strategizer) {
    var results = Recipe.over(strategizer.generated, new class extends RecipeWalker {
      onSlotConnection(recipe, slotConnection) {
        if (slotConnection.direction == "provide")
          return;
        if (slotConnection.slot)
          return;
        return (recipe, slotConnection) => {
          // TODO: handle slots that don't have a provider (like "root" slot)
          var slot = recipe.slots.find((s) => {return s.providerConnection && s.providerConnection.name == slotConnection.name});
          if (!slot)
            return 0;
          // TODO: verify set of slot.providerConnection.viewConnections[i].view.id contains
          // the set of (or at least one of? TBD) slotConnection.viewConnections[i].view.id
          slotConnection.connectToSlot(slot);
          return 1;
        };
      }
    }(RecipeWalker.Permuted), this);

    return { results, generate: null };
  }
}


class Planner {
  init(arc, context) {
    let strategies = [
      new InitPopulation(context),
      new CreateViews(),
      new ResolveParticleByName(context, arc._loader),
      new AssignViewsByTagAndType(arc),
      new ConvertConstraintsToConnections(),
      new MatchConsumedSlots(),
      new AssignRemoteViews(arc, arc._loader, context),
    ];
    this.strategizer = new Strategizer(strategies, [], {
      maxPopulation: 100,
      generationSize: 100,
      discardSize: 20,
    });
  }

  async generate() {
    var log = await this.strategizer.generate();
    return this.strategizer.generated;
  }

  async plan(arc) {
    do {
      await this.generate();
      let resolved = this.strategizer.generated
          .map(individual => individual.result)
          .filter(recipe => recipe.isResolved());
      return resolved;
    } while (this.strategizer.generated.length > 0);
    return [];
  }
}

module.exports = Planner;
