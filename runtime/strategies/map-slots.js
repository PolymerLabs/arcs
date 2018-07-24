// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

import {Strategy} from '../../strategizer/strategizer.js';
import {Recipe} from '../recipe/recipe.js';
import {Walker} from '../recipe/walker.js';
import {assert} from '../../platform/assert-web.js';

export class MapSlots extends Strategy {
  constructor(arc) {
    super();
    this._arc = arc;
  }
  async generate(inputParams) {
    let arc = this._arc;

    return Recipe.over(this.getResults(inputParams), new class extends Walker {
      onSlotConnection(recipe, slotConnection) {
        // don't try to connect verb constraints
        // TODO: is this right? Should constraints be connectible, in order to precompute the
        // recipe side once the verb is substituted?
        if (slotConnection.slotSpec == undefined)
          return;

        if (slotConnection.isConnected()) {
          return;
        }

        let {local, remote} = MapSlots.findAllSlotCandidates(slotConnection, arc);

        // ResolveRecipe handles one-slot case.
        if (local.length + remote.length < 2) {
          return;
        }

        // If there are any local slots, prefer them over remote slots.
        let slotList = local.length > 0 ? local : remote;
        return slotList.map(slot => ((recipe, slotConnection) => {
          MapSlots.connectSlotConnection(slotConnection, slot);
          return 1;
        }));
      }
    }(Walker.Permuted), this);
  }

  // Helper methods.
  // Connect the given slot connection to the selectedSlot, create the slot, if needed.
  static connectSlotConnection(slotConnection, selectedSlot) {
    let recipe = slotConnection.recipe;
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
  }

  // Returns all possible slot candidates, sorted by "quality"
  static findAllSlotCandidates(slotConnection, arc) {
    return {
      // Note: during manfiest parsing, target slot is only set in slot connection, if the slot exists in the recipe.
      // If this slot is internal to the recipe, it has the sourceConnection set to the providing connection
      // (and hence the consuming connection is considered connected already). Otherwise, this may only be a remote slot.
      local: !slotConnection.targetSlot ? MapSlots._findSlotCandidates(slotConnection, slotConnection.recipe.slots) : [],
      remote: MapSlots._findSlotCandidates(slotConnection, arc.pec.slotComposer.getAvailableContexts())
    };
  }

  // Returns the given slot candidates, sorted by "quality".
  static _findSlotCandidates(slotConnection, slots) {
    let possibleSlots = slots.filter(s => this.slotMatches(slotConnection, s));
    possibleSlots.sort((slot1, slot2) => {
        // TODO: implement.
        return slot1.name < slot2.name;
    });
    return possibleSlots;
  }

  // Returns true, if the given slot is a viable candidate for the slotConnection.
  static slotMatches(slotConnection, slot) {
    if (!MapSlots.specMatch(slotConnection, slot)) {
      return false;
    }

    if (!MapSlots.tagsOrNameMatch(slotConnection, slot)) {
      return false;
    }

    // Match handles of the provided slot with the slot-connection particle's handles.
    if (!MapSlots.handlesMatch(slotConnection, slot)) {
      return false;
    }
    return true;
  }

  static specMatch(slotConnection, slot) {
    return slotConnection.slotSpec && // if there's no slotSpec, this is just a slot constraint on a verb
          slotConnection.slotSpec.isSet == slot.spec.isSet;
  }

  // Returns true, if the slot connection's tags intersection with slot's tags is nonempty.
  // TODO: replace with generic tag matcher
  static tagsOrNameMatch(slotConnection, slot) {
    let consumeConnTags = [].concat(slotConnection.slotSpec.tags || [], slotConnection.tags, slotConnection.targetSlot ? slotConnection.targetSlot.tags : []);
    let slotTags = new Set([].concat(slot.tags, slot.spec.tags || [], [slot.name]));
    // Consume connection tags aren't empty and intersection with the slot isn't empty.
    if (consumeConnTags.length > 0 && consumeConnTags.some(t => slotTags.has(t))) {
      return true;
    }
    // For backward compatibility support explicit slot names matching.
    return (slotConnection.name === slot.name);
  }

  // Returns true, if the providing slot handle restrictions are satisfied by the consuming slot connection.
  // TODO: should we move some of this logic to the recipe? Or type matching?
  static handlesMatch(slotConnection, slot) {
    if (slot.handles.length == 0) {
      return true; // slot is not limited to specific handles
    }
    return Object.values(slotConnection.particle.connections).find(handleConn => {
      return slot.handles.includes(handleConn.handle) ||
              (handleConn.handle && handleConn.handle.id && slot.handles.map(sh => sh.id).includes(handleConn.handle.id));
    });
  }
}
