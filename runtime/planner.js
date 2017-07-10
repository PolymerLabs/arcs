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

class InitPopulation extends Strategy {
  async generate(strategizer) {
    if (strategizer.generation == 0) {
      var r = new oldRecipe.NewRecipeBuilder()
        .addParticle("WishlistFor")
          .connectConstraint("wishlist", "wishlist")
          .connectConstraint("person", "person")
        .addParticle("Recommend")
          .connectConstraint("known", "list")
          .tag("gift list")
          .connectConstraint("population", "wishlist")
          .connectConstraint("recommendations", "recommended")
        .addParticle("SaveList")
          .connectConstraint("list", "list")
        .addParticle("Choose")
          .connectConstraint("singleton", "person")
        .addParticle("ListView")
          .connectConstraint("list", "list")
        .addParticle("Chooser")
          .connectConstraint("choices", "recommended")
          .connectConstraint("resultList", "list")
        .build();

        r.normalize();
        return { results: [{result: r, score: 1, derivation: [{strategy: this, parent: undefined}], hash: r.digest() }], generate: null };
     }
     return { results: [], generate: null };
  }
}

class Shape {
  constructor(recipe, particles, views) {
    this.recipe = recipe;
    this.particles = particles;
    this.views = views;
    this.reverse = new Map();
    for (var p in particles)
      this.reverse.set(particles[p], p);
    this.reverseViews = new Map();
    for (var v in views)
      this.reverse.set(views[v], v);
  }
}

class RecipeUtil {
  static makeShape(particles, views, map, recipe) {
    recipe = recipe || new Recipe();
    var pMap = {};
    var vMap = {};
    particles.forEach(particle => pMap[particle] = recipe.newParticle(particle));
    views.forEach(view => vMap[view] = recipe.newView());
    Object.keys(map).forEach(key => {
      let { name, view } = map[key];
      pMap[key].addConnectionName(name).connectToView(vMap[view]);
    });
    return new Shape(recipe, pMap, vMap);
  }

  static find(recipe, shape) {

    function _buildNewVCMatches(recipe, shapeVC, match, outputList) {
      let {forward, reverse} = match;
      for (var recipeVC of recipe.viewConnections) {
        // TODO are there situations where multiiple viewConnections should
        // be allowed to point to the same one in the recipe?
        if (reverse.has(recipeVC))
          continue;

        if (shapeVC.name && shapeVC.name != recipeVC.name)
          continue;

        // recipeVC is a candidate for shapeVC. shapeVC references a
        // particle, so recipeVC must reference the matching particle,
        // or a particle that isn't yet mapped from shape.
        if (reverse.has(recipeVC.particle)) {
          if (reverse.get(recipeVC.particle) != shapeVC.particle)
            continue;
        } else if (forward.has(shapeVC.particle)) {
          // we've already mapped the particle referenced by shapeVC
          // and it doesn't match recipeVC's particle as recipeVC's
          // particle isn't mapped
          continue;
        }

        // shapeVC doesn't necessarily reference a view, but if it does
        // then recipeVC needs to reference the matching view, or one
        // that isn't yet mapped.
        if (shapeVC.view) {
          if (!recipeVC.view)
            continue;
          if (reverse.has(recipeVC.view)) {
            if (reverse.get(recipeVC.view) != shapeVC.view)
              continue;
          } else if (forward.has(shapeVC.view)) {
            continue;
          }
        }

        // clone forward and reverse mappings and establish new components.
        var newMatch = {forward: new Map(), reverse: new Map()};
        forward.forEach((value, key) => newMatch.forward.set(key, value));
        reverse.forEach((value, key) => newMatch.reverse.set(key, value));
        newMatch.forward.set(shapeVC.particle, recipeVC.particle);
        newMatch.reverse.set(recipeVC.particle, shapeVC.particle);
        if (shapeVC.view) {
          newMatch.forward.set(shapeVC.view, recipeVC.view);
          newMatch.reverse.set(recipeVC.view, shapeVC.view);
        }
        newMatch.reverse.set(recipeVC, shapeVC);
        outputList.push(newMatch);
      }
    }

    function _buildNewParticleMatches(recipe, shapeParticle, match, newMatches) {
      for (var recipeParticle of recipe.particles) {
        if (reverse.has(recipeParticle))
          continue;

        var newMatch = {forward: new Map(), reverse: new Map()};
        forward.forEach((value, key) => newMatch.forward.set(key, value));
        reverse.forEach((value, key) => newMatch.reverse.set(key, value));
        newMatch.forward.set(shapeParticle, recipeParticle);
        newMatch.reverse.set(recipeParticle, shapeParticle);
        newMatches.push(newMatch);
      }
    }

    // Particles and Views are initially stored by a forward map from
    // shape component to recipe component.
    // View connections, particles and views are also stored by a reverse map
    // from recipe component to shape component.
    var matches = [{forward: new Map(), reverse: new Map()}];
    for (var shapeVC of shape.recipe.viewConnections) {
      var newMatches = [];
      for (var match of matches) {
        _buildNewVCMatches(recipe, shapeVC, match, newMatches);
      }
      matches = newMatches;
    }

    for (var shapeParticle of shape.recipe.particles) {
      if (Object.keys(shapeParticle.connections).length > 0)
        continue;
      if (shapeParticle.unnamedConnections.length > 0)
        continue;
      var newMatches = [];
      for (var match of matches)
        _buildNewParticleMatches(recipe, shapeParticle, match, newMatches);
      matches = newMatches;
    }

    return matches.map(({forward}) => {
      var match = {};
      forward.forEach((value, key) => match[shape.reverse.get(key)] = value);
      return match;
    });
  }
}

class ConvertConstraintsToConnections extends Strategy {
  async generate(strategizer) {
    var results = Recipe.over(strategizer.generated, new class extends Recipe.ConstraintWalker {
      onConstraint(recipe, constraint) {
        // existing particles and views

        var connectedShape = RecipeUtil.makeShape(
            [constraint.fromParticle, constraint.toParticle],
            ['a'],
            {
              [constraint.fromParticle]: {name: constraint.fromConnection, view: 'a'},
              [constraint.toParticle]: {name: constraint.toConnection, view: 'a'}
            }
        );

        var resolved = RecipeUtil.find(recipe, connectedShape);
        if (resolved.length > 0) {
          return (recipe, constraint) => recipe.removeConstraint(constraint);
        }

        // existing particles, joined on the left side
        var leftShape = RecipeUtil.makeShape(
          [constraint.fromParticle, constraint.toParticle],
          ['a'],
          {[constraint.fromParticle]: {name: constraint.fromConnection, view: 'a'}}
        );

        // existing particles, joined on the right side
        var rightShape = RecipeUtil.makeShape(
          [constraint.fromParticle, constraint.toParticle],
          ['a'],
          {[constraint.fromParticle]: {name: constraint.toConnection, view: 'a'}}
        );

        var leftResolved = RecipeUtil.find(recipe, leftShape);
        var leftActions = leftResolved.map(resolveMap => {
          (recipe, constraint) => {
            resolveMap = recipe.updateToClone(resolveMap);
            resolveMap[constraint.toParticle].addConnectionName(constraint.toConnection).connectToView(resolveMap['a']);
            recipe.removeConstraint(constraint);
          }
        });
        var rightResolved = RecipeUtil.find(recipe, rightShape);
        var rightActions = rightResolved.map(resolveMap => {
          return (recipe, constraint) => {
            resolveMap = recipe.updateToClone(resolveMap);
            resolveMap[constraint.fromParticle].addConnectionName(constraint.fromConnection).connectToView(resolveMap['a']);
            recipe.removeConstraint(constraint);
          };
        });
        var actions = leftActions.concat(rightActions);
        if (actions.length > 0)
          return actions;

        // existing particles
        var particles = RecipeUtil.makeShape([constraint.fromParticle, constraint.toParticle], [], {});
        var resolved = RecipeUtil.find(recipe, particles);
        var actions = resolved.map(resolveMap => {
          return (recipe, constraint) => {
            resolveMap = recipe.updateToClone(resolveMap);
            var view = recipe.createView();
            resolveMap[constraint.fromParticle].addConnectionToName(constraint.fromConnection).connectToView(view);
            resolveMap[constraint.toParticle].addConnectinoToName(constraint.toConnection).connectToView(view);
            recipe.removeConstraint(constraint);
          };
        });
        if (actions.lenth > 0)
          return actions;

        // one particle
        var leftParticle = RecipeUtil.makeShape([constraint.fromParticle], [], {});
        var rightParticle = RecipeUtil.makeShape([constraint.toParticle], [], {});
        var leftResolved = RecipeUtil.find(recipe, leftParticle);
        var rightResolved = RecipeUtil.find(recipe, rightParticle);
        var leftActions = leftResolved.map(resolveMap => {
          return (recipe, constraint) => {
            resolveMap = recipe.updateToClone(resolveMap);
            var view = recipe.createView();
            resolveMap[cosntraint.fromParticle].addConnectionToName(constraint.fromConnection).connectToView(view);
            recipe.createParticle(constraint.toParticle).addConnectionToName(constraint.toConnection).connectToView(view);
            recipe.removeConstraint(constraint);
          }
        });
        var rightActions = rightResolved.map(resolveMap => {
          return (recipe, constraint) => {
            resolveMap = recipe.updateToClone(resolveMap);
            var view = recipe.createView();
            recipe.createParticle(constraint.fromParticle).addConnectionToName(constraint.fromConnection).connectToView(view);
            resolveMap[cosntraint.toParticle].addConnectionToName(constraint.toConnection).connectToView(view);
            recipe.removeConstraint(constraint);
          }
        });
        var actions = leftActions.concat(rightActions);
        if (actions.length > 0)
          return actions;

        return (recipe, constraint) => {
          RecipeUtil.makeShape(
              [constraint.fromParticle, constraint.toParticle],
              ['a'],
              {
                [constraint.fromParticle]: {name: constraint.fromConnection, view: 'a'},
                [constraint.toParticle]: {name: constraint.toConnection, view: 'a'}
              },
            recipe);
          recipe.removeConstraint(constraint);
        }
      }
    }(Recipe.Walker.ApplyEach), this);

    return { results, generate: null };
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
        if (!view.id && !view.create) {
          this.score--;
          return (recipe, view) => view.create = true;
        }
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
      new ConvertConstraintsToConnections()];
    this.strategizer = new Strategizer(strategies, [], {
      maxPopulation: 100,
      generationSize: 1000,
      discardSize: 20,
    });
  }

  async generate() {
    var log = await this.strategizer.generate();
    console.log(log);
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
