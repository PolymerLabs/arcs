/**
 * @license
 * Copyright (c) 2018 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {assert} from '../../platform/assert-web.js';
import {Arc} from '../../runtime/arc.js';
import {ConsumeSlotConnectionSpec} from '../../runtime/particle-spec.js';
import {Handle} from '../../runtime/recipe/handle.js';
import {Particle} from '../../runtime/recipe/particle.js';
import {RecipeUtil} from '../../runtime/recipe/recipe-util.js';
import {Recipe} from '../../runtime/recipe/recipe.js';
import {TypeVariable} from '../../runtime/type.js';
import {RecipeIndex} from '../recipe-index.js';
import {StrategizerWalker, Strategy} from '../strategizer.js';

// This strategy coalesces unresolved terminal recipes (i.e. those that cannot
// be modified by any strategy apart from this one) by finding unresolved
// use/? handle and finding a matching create/? handle in another recipe and
// merging those.
export class CoalesceRecipes extends Strategy {
  private recipeIndex: RecipeIndex;

  constructor(arc: Arc, {recipeIndex}) {
    super(arc);
    this.recipeIndex = recipeIndex;
  }

  getResults(inputParams) {
    // Coalescing for terminal recipes that are either unresolved recipes or have no UI.
    return inputParams.terminal.filter(result => !result.result.isResolved() || result.result.slots.length === 0);
  }

  async generate(inputParams) {
    const arc = this.arc;
    const index = this.recipeIndex;
    await index.ready;

    return StrategizerWalker.over(this.getResults(inputParams), new class extends StrategizerWalker {
      onPotentialSlotConnection(recipe: Recipe, particle: Particle, slotSpec: ConsumeSlotConnectionSpec) {
        const results = [];
        // TODO: It is possible that provided-slot wasn't matched due to different handles, but actually
        // these handles are coalescable? Add support for this.
        for (const providedSlot of index.findProvidedSlot(particle, slotSpec)) {
          // Don't grow recipes above 10 particles, otherwise we might never stop.
          if (recipe.particles.length + providedSlot.recipe.particles.length > 10) continue;

          if (RecipeUtil.matchesRecipe(arc.activeRecipe, providedSlot.recipe)) {
            // skip candidate recipe, if matches the shape of the arc's active recipe
            continue;
          }

          results.push((recipe:Recipe, particle:Particle, slotSpec:ConsumeSlotConnectionSpec) => {
            const otherToHandle = index.findCoalescableHandles(recipe, providedSlot.recipe);

            const {cloneMap} = providedSlot.recipe.mergeInto(recipe);
            const mergedSlot = cloneMap.get(providedSlot);
            const newSlotConnection = particle.addSlotConnection(slotSpec.name);
            newSlotConnection.connectToSlot(mergedSlot);

            this._connectOtherHandles(otherToHandle, cloneMap, false);

            // Clear verbs and recipe name after coalescing two recipes.
            recipe.verbs.splice(0);
            recipe.name = null;
            return 1;
          });
        }

        if (results.length > 0) {
          return results;
        }
        return undefined;
      }
      // Find a provided slot for unfulfilled consume connection.
      onSlotConnection(recipe, slotConnection) {
        if (slotConnection.isResolved()) {
          return undefined;
        }
        if (!slotConnection.name || !slotConnection.particle) {
          return undefined;
        }

        if (slotConnection.targetSlot) {
          return undefined;
        }

        // TODO: also support a consume slot connection that is NOT required,
        // but no other connections are resolved.

        const results = [];
        // TODO: It is possible that provided-slot wasn't matched due to different handles, but actually
        // these handles are coalescable? Add support for this.
        for (const providedSlot of index.findProvidedSlot(slotConnection.particle, slotConnection.spec)) {
          // Don't grow recipes above 10 particles, otherwise we might never stop.
          if (recipe.particles.length + providedSlot.recipe.particles.length > 10) continue;

          if (RecipeUtil.matchesRecipe(arc.activeRecipe, providedSlot.recipe)) {
            // skip candidate recipe, if matches the shape of the arc's active recipe
            continue;
          }

          if (RecipeUtil.matchesRecipe(recipe, providedSlot.recipe)) {
            // skip candidate recipe, if matches the shape of the currently explored recipe
            continue;
          }

          results.push((recipe, slotConnection) => {
            const otherToHandle = index.findCoalescableHandles(recipe, providedSlot.recipe);

            const {cloneMap} = providedSlot.recipe.mergeInto(slotConnection.recipe);
            const mergedSlot = cloneMap.get(providedSlot);
            slotConnection.connectToSlot(mergedSlot);

            this._connectOtherHandles(otherToHandle, cloneMap, false);

            // Clear verbs and recipe name after coalescing two recipes.
            recipe.verbs.splice(0);
            recipe.name = null;
            return 1;
          });
        }

        if (results.length > 0) {
          return results;
        }
        return undefined;
      }

      onSlot(recipe, slot) {
        // Find slots that according to their provided-spec must be consumed, but have no consume connection.
        if (slot.consumeConnections.length > 0) {
          return undefined; // slot has consume connections.
        }
        if (!slot.sourceConnection || !slot.spec.isRequired) {
          return undefined; // either a remote slot (no source connection), or a not required one.
        }

        const results = [];
        for (const {recipeParticle, slotSpec, matchingHandles} of index.findConsumeSlotConnectionMatch(slot.sourceConnection.particle, slot.spec)) {
          // Don't grow recipes above 10 particles, otherwise we might never stop.
          if (recipe.particles.length + recipeParticle.recipe.particles.length > 10) continue;

          if (RecipeUtil.matchesRecipe(arc.activeRecipe, recipeParticle.recipe)) {
            // skip candidate recipe, if matches the shape of the arc's active recipe
            continue;
          }

          if (RecipeUtil.matchesRecipe(recipe, recipeParticle.recipe)) {
            // skip candidate recipe, if matches the shape of the currently explored recipe
            continue;
          }

          results.push((recipe, slot) => {
            // Find other handles that may be merged, as recipes are being coalesced.
            const otherToHandle = index.findCoalescableHandles(recipe, recipeParticle.recipe,
              new Set(slot.handles.concat(matchingHandles.map(({handle, matchingConn}) => matchingConn.handle))));

            const {cloneMap} = recipeParticle.recipe.mergeInto(slot.recipe);
            const slotConn = recipeParticle.getSlotConnectionByName(slot.name);
            let mergedSlotConn = cloneMap.get(slotConn);
            if (!mergedSlotConn) {
              const clonedParticle = cloneMap.get(recipeParticle);
              mergedSlotConn = clonedParticle.addSlotConnection(slotSpec.name);
            }
            mergedSlotConn.connectToSlot(slot);
            for (const {handle, matchingConn} of matchingHandles) {
              // matchingConn in the mergedSlotConnection's recipe should be connected to `handle` in the slot's recipe.
              const mergedMatchingConn = cloneMap.get(matchingConn);
              const disconnectedHandle = mergedMatchingConn.handle;
              const clonedHandle = slot.findHandleByID(handle.id);
              if (disconnectedHandle === clonedHandle) {
                continue; // this handle was already reconnected
              }

              while (disconnectedHandle.connections.length > 0) {
                const conn = disconnectedHandle.connections[0];
                conn.disconnectHandle();
                conn.connectToHandle(clonedHandle);
              }
              recipe.removeHandle(disconnectedHandle);
            }

            this._connectOtherHandles(otherToHandle, cloneMap, false);

            // Clear verbs and recipe name after coalescing two recipes.
            recipe.verbs.splice(0);
            recipe.name = null;

            // TODO: Merge description/patterns of both recipes.
            // TODO: Unify common code in slot and handle recipe coalescing.

            return 1;
          });
        }

        if (results.length > 0) {
          return results;
        }
        return undefined;
      }

      onHandle(recipe, handle) {
        if (!index.coalescableFates.includes(handle.fate)
            || handle.id
            || handle.connections.length === 0
            || handle.name === 'descriptions') return undefined;
        const results = [];

        for (const otherHandle of index.findHandleMatch(handle, index.coalescableFates)) {
          // Don't grow recipes above 10 particles, otherwise we might never stop.
          if (recipe.particles.length + otherHandle.recipe.particles.length > 10) continue;

          // This is a poor man's proxy for the other handle being an output of a recipe.
          if (otherHandle.findConnectionByDirection('reads')) continue;

          // We ignore type variables not constrained for reading, otherwise
          // generic recipes would apply - which we currently don't want here.
          if (otherHandle.type.hasVariable) {
            let resolved = otherHandle.type.resolvedType();
            // TODO: getContainedType returns non-null for references ... is that correct here?
            resolved = resolved.getContainedType() || resolved;
            if (resolved instanceof TypeVariable && !resolved.canReadSubset) continue;
          }

          if (RecipeUtil.matchesRecipe(arc.activeRecipe, otherHandle.recipe)) {
            // skip candidate recipe, if matches the shape of the arc's active recipe
            continue;
          }

          if (RecipeUtil.matchesRecipe(recipe, otherHandle.recipe)) {
            // skip candidate recipe, if matches the shape of the currently explored recipe
            continue;
          }

          results.push((recipe, handle) => {
            // Find other handles in the original recipe that could be coalesced with handles in otherHandle's recipe.
            const otherToHandle = index.findCoalescableHandles(recipe, otherHandle.recipe, new Set([handle, otherHandle]));

            const {cloneMap} = otherHandle.recipe.mergeInto(handle.recipe);

            // Connect the handle that the recipes are being coalesced on.
            cloneMap.get(otherHandle).mergeInto(handle);

            // Connect all other connectable handles.
            this._connectOtherHandles(otherToHandle, cloneMap, true);

            // Clear verbs and recipe name after coalescing two recipes.
            recipe.verbs.splice(0);
            recipe.name = null;

            // TODO: Merge description/patterns of both recipes.

            return 1;
          });
        }

        return results;
      }

      _connectOtherHandles(otherToHandle, cloneMap, verifyTypes) {
        otherToHandle.forEach((otherHandle, handle) => {
          const otherHandleClone = cloneMap.get(otherHandle);

          // For coalescing that was triggered by handle coalescing (vs slot or slot connection)
          // once the main handle (one that triggered coalescing) was coalesced, types may have changed.
          // Need to verify all the type information for the "other" coalescable handles is still valid.

          // TODO(mmandlis): This is relying on only ever considering a single "other" handles to coalesce,
          // so the handle either is still a valid match or not.
          // In order to do it right for multiple handles, we need to try ALL handles,
          // then fallback to all valid N-1 combinations, then N-2 etc.
          if (verifyTypes) {
            if (!this._reverifyHandleTypes(handle, otherHandleClone)) {
              return;
            }
          }

          otherHandleClone.mergeInto(handle);
        });
      }

      // Returns true, if both handles have types that can be coalesced.
      _reverifyHandleTypes(handle, otherHandle) {
        assert(handle.recipe === otherHandle.recipe);
        const cloneMap = new Map();
        const recipeClone = handle.recipe.clone(cloneMap);
        recipeClone.normalize();
        return Handle.effectiveType(cloneMap.get(handle).type,
            [...cloneMap.get(handle).connections, ...cloneMap.get(otherHandle).connections]);
      }

    }(StrategizerWalker.Independent), this);
  }
}
