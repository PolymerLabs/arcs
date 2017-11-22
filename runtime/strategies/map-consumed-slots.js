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

export default class MapConsumedSlots extends Strategy {
  async generate(strategizer) {
    var results = Recipe.over(this.getResults(strategizer), new class extends RecipeWalker {
      onSlotConnection(recipe, slotConnection) {
        if (slotConnection.targetSlot)
          return;
        var potentialSlots = recipe.slots.filter(slot => {
          if (slotConnection.name != slot.name)
            return false;

          if (!slot.sourceConnection) {
            return;
          }

          let providedSlotSpec =
              slot.sourceConnection.slotSpec.providedSlots.find(ps => ps.name == slotConnection.name);
          if (slotConnection.slotSpec.isSet != providedSlotSpec.isSet)
            return;

          // Verify view connections match.
          var views = slot.viewConnections.map(connection => connection.view);
          if (views.length == 0) {
            return true;
          }
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
