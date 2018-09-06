// Copyright (c) 2018 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

import {Strategy} from '../../strategizer/strategizer.js';
import {Recipe} from '../recipe/recipe.js';
import {RecipeUtil} from '../recipe/recipe-util.js';
import {Walker} from '../recipe/walker.js';
import {Handle} from '../recipe/handle.js';
import {Type} from '../ts-build/type.js';
import {assert} from '../../platform/assert-web.js';

// This strategy coalesces unresolved terminal recipes (i.e. those that cannot
// be modified by any strategy apart from this one) by finding unresolved
// use/? handle and finding a matching create/? handle in another recipe and
// merging those.
export class CoalesceRecipes extends Strategy {
  constructor(arc) {
    super();
    this._arc = arc;
  }

  get arc() { return this._arc; }

  getResults(inputParams) {
    // Coalescing for terminal recipes that are either unresolved recipes or have no UI.
    return inputParams.terminal.filter(result => !result.result.isResolved() || result.result.slots.length == 0);
  }

  async generate(inputParams) {
    const arc = this.arc;
    const index = this.arc.recipeIndex;
    await index.ready;

    return Recipe.over(this.getResults(inputParams), new class extends Walker {
      // Find a provided slot for unfulfilled consume connection.
      onSlotConnection(recipe, slotConnection) {
        if (slotConnection.isResolved()) {
          return;
        }
        if (!slotConnection.name || !slotConnection.particle) {
          return;
        }

        if (slotConnection.targetSlot) {
          return;
        }

        // TODO: also support a consume slot connection that is NOT required,
        // but no other connections are resolved.

        let results = [];
        // TODO: It is possible that provided-slot wasn't matched due to different handles, but actually
        // these handles are coalescable? Add support for this.
        for (let providedSlot of index.findProvidedSlot(slotConnection)) {
          // Don't grow recipes above 10 particles, otherwise we might never stop.
          if (recipe.particles.length + providedSlot.recipe.particles.length > 10) continue;

          if (RecipeUtil.matchesRecipe(arc.activeRecipe, providedSlot.recipe)) {
            // skip candidate recipe, if matches the shape of the arc's active recipe
            continue;
          }

          results.push((recipe, slotConnection) => {
            let otherToHandle = index.findCoalescableHandles(recipe, providedSlot.recipe);

            let {cloneMap} = providedSlot.recipe.mergeInto(slotConnection.recipe);
            let mergedSlot = cloneMap.get(providedSlot);
            slotConnection.connectToSlot(mergedSlot);

            this._connectOtherHandles(otherToHandle, cloneMap);

            // Clear verbs and recipe name after coalescing two recipes.
            recipe.verbs.splice(0);
            recipe.name = null;
            return 1;
          });
        }

        if (results.length > 0) {
          return results;
        }
      }

      onSlot(recipe, slot) {
        // Find slots that according to their provided-spec must be consumed, but have no consume connection.
        if (slot.consumeConnections.length > 0) {
          return; // slot has consume connections.
        }
        if (!slot.sourceConnection || !slot.sourceConnection.slotSpec.getProvidedSlotSpec(slot.name).isRequired) {
          return; // either a remote slot (no source connection), or a not required one.
        }

        let results = [];
        for (let {slotConn, matchingHandles} of index.findConsumeSlotConnectionMatch(slot)) {
          // Don't grow recipes above 10 particles, otherwise we might never stop.
          if (recipe.particles.length + slotConn.recipe.particles.length > 10) continue;

          if (RecipeUtil.matchesRecipe(arc.activeRecipe, slotConn.recipe)) {
            // skip candidate recipe, if matches the shape of the arc's active recipe
            continue;
          }

          if (RecipeUtil.matchesRecipe(recipe, slotConn.recipe)) {
            // skip candidate recipe, if matches the shape of the currently explored recipe
            continue;
          }

          results.push((recipe, slot) => {
            // Find other handles that may be merged, as recipes are being coalesced.
            let otherToHandle = index.findCoalescableHandles(recipe, slotConn.recipe,
              new Set(slot.handleConnections.map(hc => hc.handle).concat(matchingHandles.map(({handle, matchingConn}) => matchingConn.handle))));

            let {cloneMap} = slotConn.recipe.mergeInto(slot.recipe);
            let mergedSlotConn = cloneMap.get(slotConn);
            mergedSlotConn.connectToSlot(slot);
            for (let {handle, matchingConn} of matchingHandles) {
              // matchingConn in the mergedSlotConnection's recipe should be connected to `handle` in the slot's recipe.
              let mergedMatchingConn = cloneMap.get(matchingConn);
              let disconnectedHandle = mergedMatchingConn.handle;
              let clonedHandle = slot.handleConnections.find(handleConn => handleConn.handle && handleConn.handle.id == handle.id).handle;
              if (disconnectedHandle == clonedHandle) {
                continue; // this handle was already reconnected
              }

              while (disconnectedHandle.connections.length > 0) {
                let conn = disconnectedHandle.connections[0];
                conn.disconnectHandle();
                conn.connectToHandle(clonedHandle);
              }
              recipe.removeHandle(disconnectedHandle);
            }

            this._connectOtherHandles(otherToHandle, cloneMap);

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
      }

      onHandle(recipe, handle) {
        if (!index.coalescableFates.includes(handle.fate)
            || handle.id
            || handle.connections.length === 0
            || handle.name === 'descriptions') return;
        let results = [];

        for (let otherHandle of index.findHandleMatch(handle, index.coalescableFates)) {
          // Don't grow recipes above 10 particles, otherwise we might never stop.
          if (recipe.particles.length + otherHandle.recipe.particles.length > 10) continue;

          // This is a poor man's proxy for the other handle being an output of a recipe.
          if (otherHandle.connections.find(conn => conn.direction === 'in')) continue;

          // We ignore type variables not constrained for reading, otherwise
          // generic recipes would apply - which we currently don't want here.
          if (otherHandle.type.hasVariable) {
            let resolved = otherHandle.type.resolvedType();
            if (resolved.isCollection) resolved = resolved.collectionType;
            if (resolved.isVariable && !resolved.canReadSubset) continue;
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
            let otherToHandle = index.findCoalescableHandles(recipe, otherHandle.recipe, new Set([handle, otherHandle]));

            let {cloneMap} = otherHandle.recipe.mergeInto(handle.recipe);

            // Connect the handle that the recipes are being coalesced on.
            cloneMap.get(otherHandle).mergeInto(handle);

            // Connect all other connectable handles.
            this._connectOtherHandles(otherToHandle, cloneMap);

            // Clear verbs and recipe name after coalescing two recipes.
            recipe.verbs.splice(0);
            recipe.name = null;

            // TODO: Merge description/patterns of both recipes.

            return 1;
          });
        }

        return results;
      }

      _connectOtherHandles(otherToHandle, cloneMap) {
        otherToHandle.forEach((otherHandle, handle) => cloneMap.get(otherHandle).mergeInto(handle));
      }
    }(Walker.Independent), this);
  }
}
