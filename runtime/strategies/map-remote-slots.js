// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

let {Strategy} = require('../../strategizer/strategizer.js');
let Recipe = require('../recipe/recipe.js');
let RecipeWalker = require('../recipe/walker.js');
let RecipeUtil = require('../recipe/recipe-util.js');

class MapRemoteSlots extends Strategy {
  constructor(arc, context) {
    // faked out for now
    super();
    this.remoteSlots = {root: 0};
  }
  async generate(strategizer) {
    var remoteSlots = this.remoteSlots;
    var results = Recipe.over(strategizer.generated, new class extends RecipeWalker {
      onSlotConnection(recipe, slotConnection) {
        if (slotConnection.targetSlot)
          return;
        if (remoteSlots[slotConnection.name] == undefined)
          return;
        var score = 1 - remoteSlots[slotConnection.name];
        return (recipe, slotConnection) => {
          slotConnection.connectToSlot(recipe.newSlot(slotConnection.name));
          return score;
        }
      }
    }(RecipeWalker.Permuted), this);

    return { results, generate: null };
  }
}

module.exports = MapRemoteSlots;
