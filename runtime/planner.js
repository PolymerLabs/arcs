// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

let {Strategy, Strategizer} = require('../strategizer/strategizer.js');
var assert = require("assert");
let oldRecipe = require('./recipe.js');
let Recipe = require('./new-recipe.js');
let ConvertConstraintsToConnections = require('./strategies/convert-constraints-to-connections.js');

class InitPopulation extends Strategy {
  async generate(strategizer) {
    if (strategizer.generation == 0) {
      var r = new oldRecipe.NewRecipeBuilder()
      .addParticle("Chooser")
        .connectConstraint("choices", "recommended")
        .connectConstraint("resultList", "list")
        .addParticle("WishlistFor")
          .connectConstraint("wishlist", "wishlist")
        .addParticle("Recommend")
          .connectConstraint("known", "list")
          .tag("gift list")
          .connectConstraint("population", "wishlist")
          .connectConstraint("recommendations", "recommended")
        .addParticle("SaveList")
          .connectConstraint("list", "list")
        .addParticle("Choose")
        .addParticle("ListView")
          .connectConstraint("list", "list")

        .build();

        r.newConnectionConstraint("Choose", "singleton", "WishlistFor", "person");

        r.normalize();
        return { results: [{result: r, score: 1, derivation: [{strategy: this, parent: undefined}], hash: r.digest() }], generate: null };
     }
     return { results: [], generate: null };
  }
}

class ResolveParticleByName extends Strategy {
  constructor(loader) {
    super();
    this.loader = loader;
  }
  async generate(strategizer) {
    var loader = this.loader;
    var results = Recipe.over(strategizer.generated, new class extends Recipe.Walker {
      onParticle(recipe, particle) {
        if (particle.spec == undefined) {
          var impl = loader.loadParticle(particle.name, true);
          if (impl == undefined)
            return;
          return (recipe, particle) => particle.spec = impl.spec;
        }
      }
    }(Recipe.Walker.ApplyAll), this);

    return { results, generate: null };
  }
}

class AssignViewsByTagAndType extends Strategy {
  constructor(arc) {
    super();
    this.arc = arc;
  }
  async generate(strategizer) {
    var arc = this.arc;
    var results = Recipe.over(strategizer.generated, new class extends Recipe.Walker {
      onViewConnection(recipe, viewConnection) {
        if (viewConnection.view) {
          let view = viewConnection.view;
          if (view.isResolved())
            return;
          if (view.type == undefined && viewConnection.type == undefined) {
            return;
          }
          if (view.create)
            return;
          return arc.findViews(view.type || viewConnection.type, view.tags).map(newView =>
            ((recipe, viewConnection) => {
              // TODO: verify that same Arc's view is not assigned to different connections' views.
              if (newView.type == undefined || viewConnection.type == undefined)
                viewConnection.connectToView(newView);
              viewConnection.view.id = newView.id;
            }));
        }
      }
    }(Recipe.Walker.ApplyEach), this);

    return { results, generate: null };
  }
}

class CreateViews extends Strategy {
  // TODO: move generation to use an async generator.
  async generate(strategizer) {
    var results = Recipe.over(strategizer.generated, new class extends Recipe.Walker {
      onRecipe(recipe) {
        this.score = 0;
      }

      onView(recipe, view) {
        var counts = {'in': 0, 'out': 0, 'inout': 0, 'unknown': 0}
        for (var connection of view.connections) {
          var direction = connection.direction;
          if (counts[direction] == undefined)
            direction = 'unknown';
          counts[direction]++;
        }
        counts.in += counts.inout;
        counts.out += counts.inout;

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
          this.score += score;
          return (recipe, view) => view.create = true;
        }
      }
    }(Recipe.Walker.ApplyAll), this);

    return { results, generate: null };
  }
}

class MatchConsumedSlots extends Strategy {
  async generate(strategizer) {
    var results = Recipe.over(strategizer.generated, new class extends Recipe.Walker {
      onSlotConnection(recipe, slotConnection) {
        if (slotConnection.direction == "provide")
          return;
        if (slotConnection.slot)
          return;
        return (recipe, slotConnection) => {
          // TODO: handle slots that don't have a provider (like "root" slot)
          var slot = recipe.slots.find((s) => {return s.providerConnection && s.providerConnection.name == slotConnection.name});
          if (!slot)
            return;
          // TODO: verify set of slot.providerConnection.viewConnections[i].view.id contains
          // the set of (or at least one of? TBD) slotConnection.viewConnections[i].view.id
          slotConnection.connectToSlot(slot);
        };
      }
    }(Recipe.Walker.ApplyAll), this);

    return { results, generate: null };
  }
}


class Planner {
  init(arc) {
    let strategies = [
      new InitPopulation(),
      new CreateViews(),
      new ResolveParticleByName(arc._loader),
      new AssignViewsByTagAndType(arc),
      new ConvertConstraintsToConnections(),
      new MatchConsumedSlots()];
    this.strategizer = new Strategizer(strategies, [], {
      maxPopulation: 100,
      generationSize: 1000,
      discardSize: 20,
    });
  }

  async generate() {
    var log = await this.strategizer.generate();
    return this.strategizer.generated;
  }

  async plan(arc) {
    this.init(arc);
    // TODO: Repeat until...?

    await this.generate();
    await this.generate();
    await this.generate();
    return this.strategizer.population; //.filter(possiblePlan => possiblePlan.ready);
  }
}

module.exports = Planner;
