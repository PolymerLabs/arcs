// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

import {Strategy} from '../../strategizer/strategizer.js';
import Recipe from '../recipe/recipe.js';
import RecipeWalker from '../recipe/walker.js';
import RecipeUtil from '../recipe/recipe-util.js';

export default class MapRemoteSlots extends Strategy {
  constructor(arc) {
    super();
    this.remoteSlots = arc.pec.slotComposer ? arc.pec.slotComposer.getAvailableSlots() : {};
  }
  async generate(strategizer) {
    var remoteSlots = this.remoteSlots;
    var results = Recipe.over(this.getResults(strategizer), new class extends RecipeWalker {
      onSlotConnection(recipe, slotConnection) {
        if (slotConnection.targetSlot && slotConnection.targetSlot.id)
          return;
        if (remoteSlots[slotConnection.name] == undefined)
          return;

        let matchingSlots = remoteSlots[slotConnection.name].filter(remoteSlot => {
          if (slotConnection.slotSpec.isSet != remoteSlot.providedSlotSpec.isSet) {
            return false;
          }

          var views = remoteSlot.views;
          let viewsMatch = false;
          if (views.length == 0) {
            return true;
          } else {
            var particle = slotConnection.particle;
            for (var name in particle.connections) {
              var connection = particle.connections[name];
              if (!connection.view)
                continue;
              if (views.find(v => v.id == connection.view.id)) {
                return true;
              }
            }
          }
          return false;
        });
        if (matchingSlots.length == 0) {
          return;
        }
        matchingSlots.sort((s1, s2) => {
          let score1 = 1 - s1.count;
          let score2 = 1 - s2.count;
          return score2 - score1;
        });
        let remoteSlotId = matchingSlots[0].id;
        let score = 1 - matchingSlots[0].count;

        return (recipe, slotConnection) => {
          if (!slotConnection.targetSlot) {
            let slot = recipe.slots.find(slot => {
              return (slot.id == remoteSlotId) || (!slot.id && (slot.name == slotConnection.name));
            });
            if (!slot) {
              slot = recipe.newSlot(slotConnection.name);
            }
            slotConnection.connectToSlot(slot);
          }
          slotConnection.targetSlot.id = remoteSlotId;
          return score;
        }
      }
    }(RecipeWalker.Permuted), this);

    return { results, generate: null };
  }
}
