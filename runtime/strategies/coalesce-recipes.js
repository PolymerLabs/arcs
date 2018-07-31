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
import {Type} from '../type.js';
import {assert} from '../../platform/assert-web.js';

// This strategy coalesces unresolved terminal recipes (i.e. those that cannot
// be modified by any strategy apart from this one) by finding unresolved
// use/? handle and finding a matching create/? handle in another recipe and
// merging those.
export class CoalesceRecipes extends Strategy {
  constructor(arc) {
    super();
    this._index = arc.recipeIndex;
  }

  getResults(inputParams) {
    return inputParams.terminal.filter(result => !result.result.isResolved());
  }

  async generate(inputParams) {
    const index = this._index;
    await index.ready;
    const coalescableFates = ['create', 'use', '?'];

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
          results.push((recipe, slotConnection) => {
            let otherToHandle = this._findCoalescableHandles(recipe, providedSlot.recipe);

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
          if (RecipeUtil.matchesRecipe(recipe, slotConn.recipe)) {
            // skip candidate recipe, if matches the shape of the current recipe
            continue;
          }

          results.push((recipe, slot) => {
            // Find other handles that may be merged, as recipes are being coalesced.
            let otherToHandle = this._findCoalescableHandles(recipe, slotConn.recipe,
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
        if (!coalescableFates.includes(handle.fate)
            || handle.id
            || handle.connections.length === 0
            || handle.name === 'descriptions') return;
        let results = [];

        for (let otherHandle of index.findHandleMatch(handle, coalescableFates)) {
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

          if (RecipeUtil.matchesRecipe(recipe, otherHandle.recipe)) {
            // skip candidate recipe, if matches the shape of the current recipe
            continue;
          }

          results.push((recipe, handle) => {
            // Find other handles in the original recipe that could be coalesced with handles in otherHandle's recipe.
            let otherToHandle = this._findCoalescableHandles(recipe, otherHandle.recipe, new Set([handle, otherHandle]));

            let {cloneMap} = otherHandle.recipe.mergeInto(handle.recipe);

            // Connect the handle that the recipes are being coalesced on.
            this._connectOtherHandleToHandle(handle, cloneMap.get(otherHandle));

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

      _findCoalescableHandles(recipe, otherRecipe, usedHandles) {
        assert(recipe != otherRecipe, 'Cannot coalesce handles in the same recipe');
        let otherToHandle = new Map();
        usedHandles = usedHandles || new Set();
        for (let handle of recipe.handles) {
          if (usedHandles.has(handle) || !coalescableFates.includes(handle.fate)) {
            continue;
          }
          for (let otherHandle of otherRecipe.handles) {
            if (usedHandles.has(otherHandle) || !coalescableFates.includes(otherHandle.fate)) {
              continue;
            }
            if (index.doesHandleMatch(handle, otherHandle)) {
              otherToHandle.set(handle, otherHandle);
              usedHandles.add(handle);
              usedHandles.add(otherHandle);
            }
          }
        }
        return otherToHandle;
      }

      _connectOtherHandles(otherToHandle, cloneMap) {
        otherToHandle.forEach((otherHandle, handle) => {
          this._connectOtherHandleToHandle(handle, cloneMap.get(otherHandle));
        });
      }

      _connectOtherHandleToHandle(handle, mergedOtherHandle) {
        if (!mergedOtherHandle) return null;
        while (mergedOtherHandle.connections.length > 0) {
          let [connection] = mergedOtherHandle.connections;
          connection.disconnectHandle();
          connection.connectToHandle(handle);
        }
        handle.tags = handle.tags.concat(mergedOtherHandle.tags);
        handle.recipe.removeHandle(mergedOtherHandle);
        // If both handles' fates were `use` keep their fate, otherwise set to `create`.
        handle.fate = handle.fate == 'use' && mergedOtherHandle.fate == 'use' ? 'use' : 'create';
      }
    }(Walker.Independent), this);
  }
}
