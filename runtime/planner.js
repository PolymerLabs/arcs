// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

let {Strategy, Strategizer} = require('../strategizer/strategizer.js');
var assert = require("assert");
let Recipe = require('./recipe/recipe.js');
let RecipeUtil = require('./recipe/recipe-util.js');
let RecipeWalker = require('./recipe/walker.js');
let ConvertConstraintsToConnections = require('./strategies/convert-constraints-to-connections.js');
let AssignRemoteViews = require('./strategies/assign-remote-views.js');
let AssignViewsByTagAndType = require('./strategies/assign-views-by-tag-and-type.js');
let ResolveParticleByName = require('./strategies/resolve-particle-by-name.js');
let InitPopulation = require('./strategies/init-population.js');
let MapRemoteSlots = require('./strategies/map-remote-slots.js');
let Manifest = require('./manifest.js');

const Speculator = require('./speculator.js');
const DescriptionGenerator = require('./description-generator.js');

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
        if (slotConnection.targetSlot)
          return;
        var potentialSlots = recipe.slots.filter(slot => {
          if (slotConnection.name != slot.name)
            return false;
          var views = slot.viewConnections.map(connection => connection.view);
          var particle = slotConnection.particle;
          for (var name in particle.connections) {
            var connection = particle.connections[name];
            if (views.includes(connection.view))
              return true;
          }
          return false;
        });
        return potentialSlots.map(slot => {
          return (recipe, slotConnection) => {
            let clonedSlot = recipe.updateToClone({slot})
            slotConnection.connectToSlot(clonedSlot.slot);
            return 1;
          };
        });
      }
    }(RecipeWalker.Permuted), this);

    return { results, generate: null };
  }
}


class Planner {
  // TODO: Use context.arc instead of arc
  init(arc, context) {
    this._arc = arc;
    let strategies = [
      new InitPopulation(context),
      new CreateViews(),
      new ResolveParticleByName(context),
      new AssignViewsByTagAndType(arc),
      new ConvertConstraintsToConnections(),
      new MatchConsumedSlots(),
      new AssignRemoteViews(arc, context),
      new MapRemoteSlots(arc, context)
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

  async plan(timeout) {
    timeout = timeout || NaN;
    let allResolved = [];
    let now = () => global.performance ? performance.now() : process.hrtime();
    let start = now();
    do {
      await this.generate();
      let resolved = this.strategizer.generated
          .map(individual => individual.result)
          .filter(recipe => recipe.isResolved());
      allResolved.push(...resolved);
      if (now() - start > timeout) {
        console.warn('Planner.plan timed out.');
        break;
      }
    } while (this.strategizer.generated.length > 0);
    return allResolved;
  }

  async suggest(timeout) {
    let plans = await this.plan(timeout);
    let suggestions = [];
    let speculator = new Speculator();
    return Promise.all(plans.map(async plan => {
      let relevance = await speculator.speculate(this._arc, plan);
      let rank = relevance.calcRelevanceScore();
      let description = new DescriptionGenerator(plan, relevance).description;
      return {
        plan,
        rank,
        description,
      };
    }));
  }
}

module.exports = Planner;
