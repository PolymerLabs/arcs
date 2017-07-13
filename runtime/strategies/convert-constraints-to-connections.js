// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

let {Strategy} = require('../../strategizer/strategizer.js');
let Recipe = require('../new-recipe.js');
let RecipeUtil = require('../recipe-util.js');

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
            resolveMap[constraint.toParticle].ensureConnectionName(constraint.toConnection).connectToView(resolveMap['a']);
            recipe.removeConstraint(constraint);
          }
        });
        var rightResolved = RecipeUtil.find(recipe, rightShape);
        var rightActions = rightResolved.map(resolveMap => {
          return (recipe, constraint) => {
            resolveMap = recipe.updateToClone(resolveMap);
            resolveMap[constraint.fromParticle].ensureConnectionName(constraint.fromConnection).connectToView(resolveMap['a']);
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
            var view = recipe.newView();
            resolveMap[constraint.fromParticle].ensureConnectionName(constraint.fromConnection).connectToView(view);
            resolveMap[constraint.toParticle].ensureConnectionName(constraint.toConnection).connectToView(view);
            recipe.removeConstraint(constraint);
          };
        });
        if (actions.length > 0)
          return actions;

        // one particle
        var leftParticle = RecipeUtil.makeShape([constraint.fromParticle], [], {});
        var rightParticle = RecipeUtil.makeShape([constraint.toParticle], [], {});
        var leftResolved = RecipeUtil.find(recipe, leftParticle);
        var rightResolved = RecipeUtil.find(recipe, rightParticle);
        var leftActions = leftResolved.map(resolveMap => {
          return (recipe, constraint) => {
            resolveMap = recipe.updateToClone(resolveMap);
            var view = recipe.newView();
            resolveMap[constraint.fromParticle].ensureConnectionName(constraint.fromConnection).connectToView(view);
            recipe.newParticle(constraint.toParticle).addConnectionName(constraint.toConnection).connectToView(view);
            recipe.removeConstraint(constraint);
          }
        });
        var rightActions = rightResolved.map(resolveMap => {
          return (recipe, constraint) => {
            resolveMap = recipe.updateToClone(resolveMap);
            var view = recipe.newView();
            recipe.newParticle(constraint.fromParticle).addConnectionName(constraint.fromConnection).connectToView(view);
            resolveMap[constraint.toParticle].ensureConnectionName(constraint.toConnection).connectToView(view);
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

module.exports = ConvertConstraintsToConnections;
