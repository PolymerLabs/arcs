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
import assert from '../../platform/assert-web.js';

export default class MapSlots extends Strategy {
  constructor(arc) {
    super();
    this._arc = arc;
  }
  async generate(strategizer) {
    let arc = this._arc;

    let results = Recipe.over(this.getResults(strategizer), new class extends RecipeWalker {
      onSlotConnection(recipe, slotConnection) {
        let selectedSlot;
        if (slotConnection.targetSlot) {
          if (!!slotConnection.targetSlot.sourceConnection) {
            // Target slot assigned within the current recipe.
            return;
          }
          if (!!slotConnection.targetSlot.id) {
            // Target slot assigned from preexisting slots in the arc.
            return;
          }
        } else {
          // Attempt to match the slot connection with a slot within the recipe.
          selectedSlot = this._findSlotCandidate(slotConnection, recipe.slots);
        }

        if (!selectedSlot) {
          // Attempt to fetch the slot connection with a preexiting slot.
          let candidates = arc.pec.slotComposer.getAvailableSlots();
          selectedSlot = this._findSlotCandidate(slotConnection, candidates);
        }

        if (!selectedSlot) {
          return;
        }

        return (recipe, slotConnection) => {
          if (!slotConnection.targetSlot) {
            let clonedSlot = recipe.updateToClone({selectedSlot}).selectedSlot;

            if (!clonedSlot) {
              clonedSlot = recipe.slots.find(s => selectedSlot.id && selectedSlot.id == s.id);
              if (clonedSlot == undefined) {
                clonedSlot = recipe.newSlot(selectedSlot.name);
                clonedSlot.id = selectedSlot.id;
              }
            }
            slotConnection.connectToSlot(clonedSlot);
          }

          assert(!selectedSlot.id || !slotConnection.targetSlot.id || (selectedSlot.id == slotConnection.targetSlot.id),
                 `Cannot override slot id '${slotConnection.targetSlot.id}' with '${selectedSlot.id}'`);
          slotConnection.targetSlot.id = selectedSlot.id || slotConnection.targetSlot.id;

          // TODO: need to concat to existing tags and dedup?
          slotConnection.targetSlot.tags = [...selectedSlot.tags];
          return 1;
        };
      }

      // Helper methods.
      // Chooses the best slot out of the given slot candidates.
      _findSlotCandidate(slotConnection, slots) {
        let possibleSlots = slots.filter(s => this._filterSlot(slotConnection, s));
        if (possibleSlots.length >= 0) {
          possibleSlots.sort(this._sortSlots);
          return possibleSlots[0];
        }
      }

      // Returns true, if the given slot is a viable candidate for the slotConnection.
      _filterSlot(slotConnection, slot) {
        if (slotConnection.slotSpec.isSet != slot.getProvidedSlotSpec().isSet) {
          return false;
        }

        // Match by tag on slot name.
        if (!this._tagsMatch(slotConnection, slot)) {
          // For backward compatibility support explicit slot names matching.
          if (slotConnection.name !== slot.name) {
            return false;
          }
        }

        // Match handles of the provided slot with the slot-connection particle's handles.
        if (!this._handlesMatch(slotConnection.particle, slot.handleConnections.map(connection => connection.handle))) {
          return false;
        }

        return true;
      }

      // Returns true, if the slot connection's tags intersection with slot's tags is nonempty.
      _tagsMatch(slotConnection, slot) {
        let consumeConnTags = slotConnection.slotSpec.tags || [];
        let slotTags = new Set([].concat(slot.tags, slot.getProvidedSlotSpec().tags || []));
        // Consume connection tags aren't empty and intersection with the slot isn't empty.
        return consumeConnTags.length > 0 && consumeConnTags.filter(t => slotTags.has(t)).length > 0;
      }

      // Returns true, if the providing slot handle restrictions are satisfied by the consuming slot connection.
      _handlesMatch(consumingParticle, providingSlotHandles) {
        if (providingSlotHandles.length == 0) {
          return true; // slot is not limited to specific handles
        }
        return Object.values(consumingParticle.connections).find(handleConn => {
          return providingSlotHandles.includes(handleConn.handle) ||
                 (handleConn.handle && handleConn.handle.id && providingSlotHandles.map(sh => sh.id).includes(handleConn.handle.id));
        });
      }

      _sortSlots(slot1, slot2) {
        // TODO: implement.
        return slot1.name < slot2.name;
      }
    }(RecipeWalker.Permuted), this);

    return {results, generate: null};
  }
}
