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
import {Recipe} from './recipe.js';
import {Handle, Particle, HandleConnection, SlotConnection, Slot, Recipe as PublicRecipe} from './recipe-interface.js';
import {HandleEndPoint, ParticleEndPoint, TagEndPoint, InstanceEndPoint} from './connection-constraint.js';
import {ParticleSpec} from '../../arcs-types/particle-spec.js';
import {Id} from '../../id.js';
import {InterfaceType} from '../../../types/lib-types.js';
import {Search} from './search.js';

// TODO(shanestephens): This should be a RecipeBuilder
export const newRecipe = (name?: string) => new Recipe(name);
export const newHandleEndPoint = (handle: Handle) => new HandleEndPoint(handle);
export const newParticleEndPoint = (particle: ParticleSpec, connection: string) => new ParticleEndPoint(particle, connection);
export const newTagEndPoint = (tags: string[]) => new TagEndPoint(tags);
export const newInstanceEndPoint = (particle: Particle, connection: string) => new InstanceEndPoint(particle, connection);
export const newSearch = (phrase: string, unresolvedTokens?: string[]) => new Search(phrase, unresolvedTokens);

export function constructImmediateValueHandle(connection: HandleConnection, particleSpec: ParticleSpec, id: Id): Handle {
  assert(connection.type instanceof InterfaceType);

  if (!(connection.type instanceof InterfaceType) ||
      !connection.type.interfaceInfo.restrictType(particleSpec)) {
    // Type of the connection does not match the ParticleSpec.
    return null;
  }

  // The connection type may have type variables:
  // E.g. if connection shape requires `in ~a *`
  //      and particle has `in Entity input`
  //      then type system has to ensure ~a is at least Entity.
  // The type of a handle hosting the particle literal has to be
  // concrete, so we concretize connection type with maybeEnsureResolved().
  const handleType = connection.type.clone(new Map());
  handleType.maybeEnsureResolved();

  const handle = connection.recipe.newHandle();
  handle.id = id.toString();
  handle.mappedType = handleType;
  handle.fate = 'copy';
  handle.immediateValue = particleSpec;

  return handle;
}

// Helper methods.
function getClonedSlot(recipe: PublicRecipe, selectedSlot: Slot): Slot {
  let clonedSlot: Slot|undefined = recipe.updateToClone({selectedSlot}).selectedSlot;
  if (clonedSlot) {
    return clonedSlot;
  }

  if (selectedSlot.id) {
    clonedSlot = recipe.findSlotByID(selectedSlot.id);
  }
  if (clonedSlot === undefined) {
    if (recipe.parent) {
      clonedSlot = recipe.parent.newSlot(selectedSlot.name);
    } else {
      clonedSlot = recipe.newSlot(selectedSlot.name);
    }
    clonedSlot.id = selectedSlot.id;
    return clonedSlot;
  }
  return clonedSlot;
}

// Connect the given slot connection to the selectedSlot, create the slot, if needed.
export function connectSlotConnection(slotConnection: SlotConnection, selectedSlot: Slot): void {
  const recipe = slotConnection.recipe;
  if (!slotConnection.targetSlot) {
    const clonedSlot = getClonedSlot(recipe, selectedSlot);
    slotConnection.connectToSlot(clonedSlot);
  }
  if (!slotConnection.targetSlot) {
    throw new Error('missing targetSlot');
  }

  assert(!selectedSlot.id || !slotConnection.targetSlot.id || (selectedSlot.id === slotConnection.targetSlot.id),
          `Cannot override slot id '${slotConnection.targetSlot.id}' with '${selectedSlot.id}'`);
  slotConnection.targetSlot.id = selectedSlot.id || slotConnection.targetSlot.id;

  // TODO: need to concat to existing tags and dedup?
  slotConnection.targetSlot.tags = [...selectedSlot.tags];
}

export function replaceOldSlot(oldSlot: Slot, newSlot: Slot): boolean {
  if (oldSlot && (!oldSlot.id || oldSlot.id !== newSlot.id)) {
    if (oldSlot.sourceConnection !== undefined) {
      if (newSlot.sourceConnection === undefined) return false;
      const clonedSlot = getClonedSlot(oldSlot.sourceConnection.recipe, newSlot);
      oldSlot.sourceConnection.providedSlots[oldSlot.name] = clonedSlot;
    }

    while (oldSlot.consumeConnections.length > 0) {
      const conn = oldSlot.consumeConnections[0];
      conn.disconnectFromSlot();
      connectSlotConnection(conn, newSlot);
    }

  }

  return true;
}
