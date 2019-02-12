// Copyright (c) 2019 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

import { O_TRUNC } from 'constants';

import {assert} from '../../platform/assert-web.js';
import {ProvidedSlotSpec, SlotSpec} from '../particle-spec.js';

import {Particle} from './particle.js';
import {Recipe, RequireSection} from './recipe.js';
import {SlotConnection} from './slot-connection.js';
import {Slot} from './slot.js';

export class SlotUtils {
  // Helper methods.
  static getClonedSlot(recipe, selectedSlot) {
    let clonedSlot = recipe.updateToClone({selectedSlot}).selectedSlot;
    if (!clonedSlot) {
      if (selectedSlot.id) {
        clonedSlot = recipe.findSlotByID(selectedSlot.id);
      }
      if (clonedSlot == undefined) {
        if (recipe instanceof RequireSection) {
          clonedSlot = recipe.parent.newSlot(selectedSlot.name);
        } else {
          clonedSlot = recipe.newSlot(selectedSlot.name);
        }
        clonedSlot.id = selectedSlot.id;
      }
    }
    return clonedSlot;
  }

  // Connect the given slot connection to the selectedSlot, create the slot, if needed.
  static connectSlotConnection(slotConnection, selectedSlot) {
    const recipe = slotConnection.recipe;
    if (!slotConnection.targetSlot) {
      const clonedSlot = SlotUtils.getClonedSlot(recipe, selectedSlot);
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
      local: !slotConn || !slotConn.targetSlot ? SlotUtils._findSlotCandidates(particle, slotSpec, particle.recipe.slots) : [],
      remote: SlotUtils._findSlotCandidates(particle, slotSpec, arc.pec.slotComposer.getAvailableContexts())
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
    if (!SlotUtils.specMatch(slotSpec, slot.spec)) {
      return false;
    }

    const potentialSlotConn = particle.getSlotConnectionBySpec(slotSpec);
    if (!SlotUtils.tagsOrNameMatch(slotSpec, slot.spec, potentialSlotConn, slot)) {
      return false;
    }

    // Match handles of the provided slot with the slot-connection particle's handles.
    if (!SlotUtils.handlesMatch(particle, slot)) {
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

  static replaceOldSlot(recipe: Recipe, oldSlot: Slot, newSlot: Slot): boolean {
    if (oldSlot && (!oldSlot.id || oldSlot.id !== newSlot.id)) {
      if (oldSlot.sourceConnection !== undefined) {
        if (newSlot.sourceConnection === undefined) return false;
        const clonedSlot = SlotUtils.getClonedSlot(oldSlot.sourceConnection.recipe, newSlot);
        oldSlot.sourceConnection.providedSlots[oldSlot.name] = clonedSlot;
        clonedSlot.sourceConnection = oldSlot.sourceConnection;
      }

      while (oldSlot.consumeConnections.length > 0) {
        const conn = oldSlot.consumeConnections[0];
        conn.disconnectFromSlot();
        SlotUtils.connectSlotConnection(conn, newSlot);
      }
      
    }
    
    return true;
  }
}

