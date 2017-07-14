// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

var Strategizer = require('../../strategizer/strategizer.js').Strategizer;
var Recipe = require('./recipe.js');
var Walker = require('./walker.js');

class ConstraintWalker extends Strategizer.Walker {
  constructor(tactic) {
    super();
    this.tactic = tactic;
  }

  onResult(result) {
    super.onResult(result);
    var recipe = result.result;
    var updateList = [];

    recipe._connectionConstraints.forEach(constraint => {
      if (this.onConstraint) {
        var result = this.onConstraint(recipe, constraint);
        if (result)
          updateList.push({continuation: result, context: constraint});
      }
    });

    var newRecipes = [];
    if (updateList.length) {
      switch (this.tactic) {
        case Walker.ApplyAll:
          var cloneMap = new Map();
          var newRecipe = recipe.clone(cloneMap);
          updateList.forEach(({continuation, context}) => {
            if (typeof continuation == 'function')
              continuation = [continuation];
            continuation.forEach(f => {
              f(newRecipe, cloneMap.get(context));
            });
          });
          newRecipes.push(newRecipe);
          break;
        case Walker.ApplyEach:
          updateList.forEach(({continuation, context}) => {
            var cloneMap = new Map();
            var newRecipe = recipe.clone(cloneMap);
            if (typeof continuation == 'function')
              continuation = [continuation];
            continuation.forEach(f => {
              f(newRecipe, cloneMap.get(context));
            });
            newRecipes.push(newRecipe);
          });
          break;
        default:
          throw `${this.tactic} not supported`;
      }
    }

    for (var newRecipe of newRecipes) {
      var result = this.createDescendant(newRecipe);
    }
  }

  createDescendant(recipe) {
    let valid = recipe.normalize();
    // TODO: something with valid
    super.createDescendant(recipe, recipe.digest());
  }
}

module.exports = ConstraintWalker;
