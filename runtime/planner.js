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
        .connectConstraint("resultList", "list")
        .addParticle("Recommend")
          .connectConstraint("known", "list")
          .connectConstraint("population", "wishlist")
          .tag("gift list")
        .addParticle("SaveList")
          .connectConstraint("list", "list")
        .addParticle("ListView")
          .connectConstraint("list", "list")

        .build();

        r.newConnectionConstraint("Chooser", "choices", "Recommend", "recommendations");

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
  constructor(arc, context) {
    super();
    this.arc = arc;
    this.mappable = [];
    var Person = arc._loader.loadEntity("Person");
    var peopleViews = arc.findViews(Person.type.viewOf());
    // TODO: do this properly
    var people = peopleViews.map(view => view.toList()).reduce((a,b) => a.concat(b), [])
      .map(a => a.rawData.name);
    people.forEach(person => {
      this.mappable = this.mappable.concat(context[person]);
    });
  }
  async generate(strategizer) {
    var arc = this.arc;
    var mappable = this.mappable;
    var results = Recipe.over(strategizer.generated, new class extends RecipeWalker {
      onViewConnection(recipe, vc) {
        if (vc.view)
          return;
        if (!vc.type)
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

        if (view.id)
          return;

        if (!view.type)
          return;

        // TODO: using the connection to retrieve type information is wrong.
        // Once validation of recipes generates type information on the view
        // we should switch to using that instead.
        var counts = directionCounts(view);
        return this.mapView(view, view.tags, view.type, counts);
      }

      mapView(view, tags, type, counts) {
        var score = -1;
        if (counts.in == 0 || counts.out == 0) {
          if (counts.unknown > 0)
            return;
          if (counts.out == 0)
            score = 1;
          else
            score = 0;
        }

        var contextIsViewConnection = view == null;
        if (contextIsViewConnection) {
          score -= 2;
        }

        if (tags.length > 0) {
          // score bump for matching tag information
          score += 4;
          var views = arc.findViews(type, {tag: tags[0]});
          views = views.concat(mappable.map(arc => arc.findViews(type, {tag: tags[0]})).reduce((a,b) => a.concat(b), []));
        }
        else
        {
          var views = arc.findViews(type);
          views = views.concat(mappable.map(arc => arc.findViews(type)).reduce((a,b) => a.concat(b), []));
        }

        if (views.length == 0)
          return;

        var responses = views.map(newView =>
          ((recipe, clonedObject) => {
            for (var existingView of recipe.views)
              if (existingView.id == newView.id)
                return 0;
            var tscore = 0;
            if (contextIsViewConnection) {
              var clonedView = recipe.newView();
              clonedObject.connectToView(clonedView);
            } else {
              var clonedView = clonedObject;
            }
            assert(newView.id);
            clonedView.mapToView(newView);
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
  init(arc, context) {
    let strategies = [
      new InitPopulation(),
      new CreateViews(),
      new ResolveParticleByName(arc._loader),
      new AssignViewsByTagAndType(arc, context),
      new ConvertConstraintsToConnections(),
      new MatchConsumedSlots(),
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
    this.init(arc);
    // TODO: Repeat until...?

    await this.generate();
    await this.generate();
    await this.generate();
    return this.strategizer.population; //.filter(possiblePlan => possiblePlan.ready);
  }
}

module.exports = Planner;
