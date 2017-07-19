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
let RecipeWalker = require('./recipe/walker.js');
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
    var results = Recipe.over(strategizer.generated, new class extends RecipeWalker {
      onParticle(recipe, particle) {
        if (particle.spec == undefined) {
          var impl = loader.loadParticle(particle.name, true);
          if (impl == undefined)
            return;
          return (recipe, particle) => {particle.spec = impl.spec; return 1};
        }
      }
    }(RecipeWalker.Permuted), this);

    return { results, generate: null };
  }
}

function directionCounts(view) {
  var counts = {'in': 0, 'out': 0, 'inout': 0, 'unknown': 0}
  for (var connection of view.connections) {
    var direction = connection.direction;
    if (counts[direction] == undefined)
      direction = 'unknown';
    counts[direction]++;
  }
  counts.in += counts.inout;
  counts.out += counts.inout;
  return counts;
}

class AssignViewsByTagAndType extends Strategy {
  constructor(arc) {
    super();
    this.arc = arc;
  }
  async generate(strategizer) {
    var arc = this.arc;
    var results = Recipe.over(strategizer.generated, new class extends RecipeWalker {
      onViewConnection(recipe, vc) {
        if (vc.view)
          return;
        if (vc.direction == 'in')
          var counts = {'in': 1, 'out': 0, 'unknown': 0};
        else if (vc.direction == 'out')
          var counts = {'in': 0, 'out': 1, 'unknown': 0};
        else if (vc.direction == 'inout')
          var counts = {'in': 1, 'out': 1, 'unknown': 0};
        else
          var counts = {'in': 0, 'out': 0, 'unknown': 1};
        return this.mapView(null, vc.tags, vc.type, counts);
      }
      onView(recipe, view) {
        if (view.create)
          return;

        if (view.connections.length == 0)
          return;

        // TODO: using the connection to retrieve type information is wrong.
        // Once validation of recipes generates type information on the view
        // we should switch to using that instead.
        var counts = directionCounts(view);
        return this.mapView(view, view.tags, view.connections[0].type, counts);
      }

      mapView(view, tags, type, counts) {
        var score = -1;
        if (counts.in == 0 || counts.out == 0) {
          if (counts.unknown > 0)
            return;
          if (counts.in == 0)
            score = 1;
          else
            score = 0;
        }

        var contextIsViewConnection = view == null;

        var responses = arc.findViews(type, tags).map(newView =>
          ((recipe, clonedObject) => {
            var tscore = 0;
            if (contextIsViewConnection) {
              view = recipe.newView();
              clonedObject.connectToView(view);
              tscore += 1;
            } else {
              view = clonedObject;
            }
            for (var existingView of recipe.views)
              if (existingView.id == newView.id)
                tscore -= 1;
            if (view.mapToView == undefined)
              console.log(view);
            view.mapToView(newView);
            return score + tscore;
          }));
        responses.push(null); // "do nothing" for this view.
        return responses;
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
        var counts = directionCounts(view);

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
