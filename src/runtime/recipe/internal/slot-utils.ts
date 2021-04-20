/**
 * @license
 * Copyright 2020 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {assert} from '../../../platform/assert-web.js';
import {ProvideSlotConnectionSpec, ConsumeSlotConnectionSpec} from '../../arcs-types/particle-spec.js';

import {Recipe, Particle, Slot, SlotConnection} from './recipe-interface.js';

// Returns all possible slot candidates, sorted by "quality"
export function findAllSlotCandidates(particle: Particle, slotSpec: ConsumeSlotConnectionSpec, arcInfo) {
  const slotConn = particle.getSlandleConnectionByName(slotSpec.name);
  return {
    // Note: during manfiest parsing, target slot is only set in slot connection, if the slot exists in the recipe.
    // If this slot is internal to the recipe, it has the sourceConnection set to the providing connection
    // (and hence the consuming connection is considered connected already). Otherwise, this may only be a remote slot.
    local: !slotConn || !slotConn.targetSlot ? _findSlotCandidates(particle, slotSpec, particle.recipe.slots) : [],
    remote: _findSlotCandidates(particle, slotSpec, [...arcInfo.slotContainers, ...arcInfo.activeRecipe.slots])
  };
}

// Returns the given slot candidates, sorted by "quality".
// TODO(sjmiles): `slots` is either Slot[] or ProvidedSlotContext[] ... these types do not obviously match,
// seems like it's using only `[thing].spec`
function _findSlotCandidates(particle: Particle, slotSpec: ConsumeSlotConnectionSpec, slots) {
  const possibleSlots = slots.filter(s => slotMatches(particle, slotSpec, s));
  possibleSlots.sort((slot1, slot2) => {
      // TODO: implement.
      return slot1.name < slot2.name;
  });
  return possibleSlots;
}

// Returns true, if the given slot is a viable candidate for the slotConnection.
export function slotMatches(particle: Particle, slotSpec: ConsumeSlotConnectionSpec, slot): boolean {
  if (!slotSpec || !slot.spec || slotSpec.isSet !== slot.spec.isSet) {
    return false;
  }
  const potentialSlotConn = particle.getSlandleConnectionBySpec(slotSpec);
  if (!tagsOrNameMatch(slotSpec, slot.spec, potentialSlotConn, slot)) {
    return false;
  }
  // Match handles of the provided slot with the slot-connection particle's handles.
  if (!handlesMatch(particle, slot)) {
    return false;
  }
  return true;
}

// Returns true, if the providing slot handle restrictions are satisfied by the consuming slot connection.
// TODO: should we move some of this logic to the recipe? Or type matching?
export function handlesMatch(particle: Particle, slot): boolean {
  if (slot.handles.length === 0) {
    return true; // slot is not limited to specific handles
  }
  return !!Object.values(particle.connections).find(handleConn => {
    return slot.handles.includes(handleConn.handle) ||
            (handleConn.handle && handleConn.handle.id && slot.handles.map(sh => sh.id).includes(handleConn.handle.id));
  });
}

export function tagsOrNameMatch(consumeSlotSpec: ConsumeSlotConnectionSpec, provideSlotSpec: ProvideSlotConnectionSpec, consumeSlotConn?: SlotConnection, provideSlot?: Slot) {
  const consumeTags: string[] = ([] as string[]).concat(
    consumeSlotSpec.tags || [],
    consumeSlotConn ? consumeSlotConn.tags : [],
    consumeSlotConn && consumeSlotConn.targetSlot ? consumeSlotConn.targetSlot.tags : []
  );

  const provideTags = ([] as string[]).concat(
    provideSlotSpec.tags || [],
    provideSlot ? provideSlot.tags : [],
    provideSlot ? provideSlot.name : (provideSlotSpec.name ? provideSlotSpec.name : [])
  );

  if (consumeTags.length > 0 && consumeTags.some(t => provideTags.includes(t))) {
    return true;
  }

  return consumeSlotSpec.name === (provideSlot ? provideSlot.name : provideSlotSpec.name);
}


