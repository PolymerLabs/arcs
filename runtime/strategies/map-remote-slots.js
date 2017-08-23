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
  constructor(arc) {
    super();
    this.remoteSlots = arc.pec.slotComposer ? arc.pec.slotComposer.getAvailableSlots() : {};
  }
  async generate(strategizer) {
    var remoteSlots = this.remoteSlots;
    var results = Recipe.over(strategizer.generated, new class extends RecipeWalker {
      onSlotConnection(recipe, slotConnection) {
        if (slotConnection.targetSlot)
          return;
        if (remoteSlots[slotConnection.name] == undefined)
          return;

        // TODO: verify isSet matches the map-remote-slots and map-consumed strategies.

        // TODO: remoteSlots[name] should be an array, for the case when a slot
        // with the same name is provided by multiple particles (eg ShowProducts and Chooser)
        var views = remoteSlots[slotConnection.name].views;
        let viewsMatch = false;
        if (views.length == 0) {
          viewsMatch = true;
        } else {
          var particle = slotConnection.particle;
          for (var name in particle.connections) {
            var connection = particle.connections[name];
            if (!connection.view)
              continue;
            if (views.find(v => v.id == connection.view.id)) {
              viewsMatch = true;
              break;
            }
          }
        }
        if (!viewsMatch) {
          return;
        }

        var score = 1 - remoteSlots[slotConnection.name].count;
        return (recipe, slotConnection) => {
          let slot = recipe.newSlot(slotConnection.name);
          slot.id = remoteSlots[slotConnection.name].id;
          slotConnection.connectToSlot(slot);
          return score;
        }
      }
    }(RecipeWalker.Permuted), this);

    return { results, generate: null };
  }
}

module.exports = MapRemoteSlots;
