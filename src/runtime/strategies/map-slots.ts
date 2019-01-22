// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

import {Strategizer, Strategy} from '../../planning/strategizer.js';
import {Recipe} from '../recipe/recipe.js';
import {Walker} from '../recipe/walker.js';
import {SlotConnection} from '../recipe/slot-connection.js';
import {Particle} from '../recipe/particle.js';
import {SlotSpec, ProvidedSlotSpec} from '../particle-spec.js';
import {Slot} from '../recipe/slot.js';

import {assert} from '../../platform/assert-web.js';

export class MapSlots extends Strategy {
  async generate(inputParams) {
    const arc = this.arc;

    return Strategizer.over(this.getResults(inputParams), new class extends Walker {
      onPotentialSlotConnection(recipe: Recipe, particle: Particle, slotSpec: SlotSpec) {
        const {local, remote} = MapSlots.findAllSlotCandidates(particle, slotSpec, arc); 
        // ResolveRecipe handles one-slot case.
        if (local.length + remote.length < 2) {
          return undefined;
        }

        // If there are any local slots, prefer them over remote slots.
        // TODO: There should not be any preference over local slots vs. remote slots.
        // Strategies should be responsible for making all possible recipes. Ranking of 
        // recipes is done later. 
        const slotList = local.length > 0 ? local : remote;
        return slotList.map(slot => ((recipe: Recipe, particle: Particle, slotSpec: SlotSpec) => {
          const newSlotConnection = particle.addSlotConnection(slotSpec.name);
          MapSlots.connectSlotConnection(newSlotConnection, slot);
          return 1;
        }));
      }

      // TODO: this deals with cases where a SlotConnection has been
      // created during parsing, so that provided slots inside the 
      // connection can be connected to consume connections.
      // Long term, we shouldn't have to do this, so we won't need
      // to deal with the case of a disconnected SlotConnection.
      onSlotConnection(recipe: Recipe, slotConnection: SlotConnection) {
        // don't try to connect verb constraints
        // TODO: is this right? Should constraints be connectible, in order to precompute the
        // recipe side once the verb is substituted?
        if (slotConnection.getSlotSpec() == undefined) {
          return undefined;
        }

        if (slotConnection.isConnected()) {
          return;
        }
        const slotSpec = slotConnection.getSlotSpec();
        const particle = slotConnection.particle;

        const {local, remote} = MapSlots.findAllSlotCandidates(particle, slotSpec, arc);
        if (local.length + remote.length < 2) {
          return undefined;
        }

        // If there are any local slots, prefer them over remote slots.
        const slotList = local.length > 0 ? local : remote;
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
    const recipe = slotConnection.recipe;
    if (!slotConnection.targetSlot) {
      let clonedSlot = recipe.updateToClone({selectedSlot}).selectedSlot;

      if (!clonedSlot) {
        if (selectedSlot.id) {
          clonedSlot = recipe.findSlotByID(selectedSlot.id);
        }
        if (clonedSlot == undefined) {
          clonedSlot = recipe.newSlot(selectedSlot.name);
          clonedSlot.id = selectedSlot.id;
        }
      }
      slotConnection.connectToSlot(clonedSlot);
    }

    assert(!selectedSlot.id || !slotConnection.targetSlot.id || (selectedSlot.id === slotConnection.targetSlot.id),
            `Cannot override slot id '${slotConnection.targetSlot.id}' with '${selectedSlot.id}'`);
    slotConnection.targetSlot.id = selectedSlot.id || slotConnection.targetSlot.id;

    // TODO: need to concat to existing tags and dedup?
    slotConnection.targetSlot.tags = [...selectedSlot.tags];
  }

  // Returns all possible slot candidates, sorted by "quality"
  static findAllSlotCandidates(particle: Particle, slotSpec: SlotSpec, arc) {
    const slotConn = particle.getSlotConnectionByName(slotSpec.name);
    return {
      // Note: during manfiest parsing, target slot is only set in slot connection, if the slot exists in the recipe.
      // If this slot is internal to the recipe, it has the sourceConnection set to the providing connection
      // (and hence the consuming connection is considered connected already). Otherwise, this may only be a remote slot.
      local: !slotConn || !slotConn.targetSlot ? MapSlots._findSlotCandidates(particle, slotSpec, particle.recipe.slots) : [],
      remote: MapSlots._findSlotCandidates(particle, slotSpec, arc.pec.slotComposer.getAvailableContexts())
    };
  }

  // Returns the given slot candidates, sorted by "quality".
  static _findSlotCandidates(particle: Particle, slotSpec: SlotSpec, slots) {
    const possibleSlots = slots.filter(s => this.slotMatches(particle, slotSpec, s));
    possibleSlots.sort((slot1, slot2) => {
        // TODO: implement.
        return slot1.name < slot2.name;
    });
    return possibleSlots;
  }

  // Returns true, if the given slot is a viable candidate for the slotConnection.
  static slotMatches(particle: Particle, slotSpec: SlotSpec, slot) {
    if (!MapSlots.specMatch(slotSpec, slot.spec)) {
      return false;
    }

    const potentialSlotConn = particle.getSlotConnectionBySpec(slotSpec);
    if (!MapSlots.tagsOrNameMatch(slotSpec, slot.spec, potentialSlotConn, slot)) {
      return false;
    }

    // Match handles of the provided slot with the slot-connection particle's handles.
    if (!MapSlots.handlesMatch(particle, slot)) {
      return false;
    }
    return true;
  }

  static specMatch(slotSpec, providedSlotSpec) {
    return slotSpec && // if there's no slotSpec, this is just a slot constraint on a verb
            providedSlotSpec &&      
            slotSpec.isSet === providedSlotSpec.isSet;
  }

  // Returns true, if the providing slot handle restrictions are satisfied by the consuming slot connection.
  // TODO: should we move some of this logic to the recipe? Or type matching?
  static handlesMatch(particle: Particle, slot): boolean {
    if (slot.handles.length === 0) {
      return true; // slot is not limited to specific handles
    }
    return !!Object.values(particle.connections).find(handleConn => {
      return slot.handles.includes(handleConn.handle) ||
              (handleConn.handle && handleConn.handle.id && slot.handles.map(sh => sh.id).includes(handleConn.handle.id));
    });
  }

  static tagsOrNameMatch(consumeSlotSpec: SlotSpec, provideSlotSpec: ProvidedSlotSpec, consumeSlotConn: SlotConnection = undefined, provideSlot: Slot = undefined) {
    const consumeTags = [].concat(
      consumeSlotSpec.tags || [], 
      consumeSlotConn ? consumeSlotConn.tags : [], 
      consumeSlotConn && consumeSlotConn.targetSlot ? consumeSlotConn.targetSlot.tags : []
    );

    const provideTags = [].concat(
      provideSlotSpec.tags || [], 
      provideSlot ? provideSlot.tags : [], 
      provideSlot ? provideSlot.name : (provideSlotSpec.name ? provideSlotSpec.name : [])
    );

    if (consumeTags.length > 0 && consumeTags.some(t => provideTags.includes(t))) {
      return true;
    }

    return consumeSlotSpec.name === (provideSlot ? provideSlot.name : provideSlotSpec.name);
  }
}
