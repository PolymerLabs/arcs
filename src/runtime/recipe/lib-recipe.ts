/**
 * @license
 * Copyright 2020 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import {Recipe, Particle, Handle, Slot, HandleConnection, SlotConnection, ConnectionConstraint, EndPoint, ParticleEndPoint,
        InstanceEndPoint, Search, RecipeComponent, IsValidOptions, ToStringOptions, effectiveTypeForHandle} from './internal/recipe-interface.js';
import {newRecipe, newHandleEndPoint, newParticleEndPoint, newTagEndPoint, newInstanceEndPoint, constructImmediateValueHandle,
        newSearch, connectSlotConnection, replaceOldSlot} from './internal/recipe-constructor.js';
import {RecipeWalker} from './internal/recipe-walker.js';
import {HandleRepr, matchesRecipe, makeShape, find} from './internal/recipe-matching.js';
import {Direction} from '../arcs-types/enums.js';
import {findAllSlotCandidates, handlesMatch, slotMatches,tagsOrNameMatch} from './internal/slot-utils.js';

export {Recipe, Particle, Handle, Slot, HandleConnection, SlotConnection, ConnectionConstraint, EndPoint, ParticleEndPoint,
        InstanceEndPoint, Search, RecipeComponent, IsValidOptions, ToStringOptions, effectiveTypeForHandle};
export {newRecipe, newHandleEndPoint, newParticleEndPoint, newTagEndPoint, newInstanceEndPoint, constructImmediateValueHandle,
        newSearch, connectSlotConnection, replaceOldSlot};
export {RecipeWalker};
export {HandleRepr, matchesRecipe, makeShape, find};

// TODO(shanestephens): These functions are all inappropriately polymorphic on the type of the 'slot' parameter.
// They need to be significantly refactored or removed.
export {findAllSlotCandidates, handlesMatch, slotMatches, tagsOrNameMatch};

export type DirectionCounts = {[K in Direction]: number};

// TODO(shanestephens): Find a better place for this.
export function directionCounts(handle: Handle): DirectionCounts {
  const counts: DirectionCounts = {'reads': 0, 'writes': 0, 'reads writes': 0, 'hosts': 0, '`consumes': 0, '`provides': 0, 'any': 0};
  for (const connection of handle.connections) {
    counts[connection.direction]++;
  }
  counts.reads += counts['reads writes'];
  counts.writes += counts['reads writes'];
  return counts;
}

// TODO(shanestephens): Find a better place for this.
export function reverseDirection(direction: Direction): Direction {
  switch (direction) {
    case 'reads':
      return 'writes';
    case 'writes':
      return 'reads';
    case 'reads writes':
      return 'reads writes';
    case '`consumes':
      return '`provides';
    case '`provides':
      return '`consumes';
    case 'any':
      return 'any';
    default:
      // Catch nulls and unsafe values from javascript.
      throw new Error(`Bad direction ${direction}`);
  }
}