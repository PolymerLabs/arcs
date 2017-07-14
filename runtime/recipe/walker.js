// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

var Strategizer = require('../../strategizer/strategizer.js').Strategizer;
var Recipe = require('./recipe.js');

class Walker extends Strategizer.Walker {
  constructor(tactic) {
    super();
    this.tactic = tactic;
  }

  onResult(result) {
    super.onResult(result);
    var recipe = result.result;
    var updateList = [];

    // update phase - walk through recipe and call onRecipe,
    // onView, etc.

    this.onRecipe && this.onRecipe(recipe, result);
    for (var particle of recipe.particles) {
      if (this.onParticle) {
        var result = this.onParticle(recipe, particle);
        if (!this.isEmptyResult(result))
          updateList.push({continuation: result, context: particle});
      }
    }
    for (var viewConnection of recipe.viewConnections) {
      if (this.onViewConnection) {
        var result = this.onViewConnection(recipe, viewConnection);
        if (!this.isEmptyResult(result))
          updateList.push({continuation: result, context: viewConnection});
      }
    }
    for (var view of recipe.views) {
      if (this.onView) {
        var result = this.onView(recipe, view);
        if (!this.isEmptyResult(result))
          updateList.push({continuation: result, context: view});
      }
    }
    for (var slotConnection of recipe.slotConnections) {
      if (this.onSlotConnection) {
        var result = this.onSlotConnection(recipe, slotConnection);
        if (!this.isEmptyResult(result))
          updateList.push({continuation: result, context: slotConnection});
      }
    }
    for (var slot of recipe.slots) {
      if (this.onSlot) {
        var result = this.onSlot(recipe, slot);
        if (!this.isEmptyResult(result))
          updateList.push({continuation: result, context: slot});
      }
    }

    // application phase - apply updates and track results

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

    // commit phase - output results.

    for (var newRecipe of newRecipes) {
      var result = this.createDescendant(newRecipe);
    }
  }

  createDescendant(recipe) {
    let valid = recipe.normalize();
    // TODO: something with valid
    super.createDescendant(recipe, recipe.digest());
  }

  isEmptyResult(result) {
    if (!result)
      return true;

    if (result.constructor == Array && result.length <= 0)
      return true;

    return false;
  }
}

Walker.ApplyAll = "apply all";
Walker.ApplyEach = "apply each";

module.exports = Walker;
