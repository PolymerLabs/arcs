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

    return Recipe.over(this.getResults(inputParams), new class extends Walker {
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
          results.push((recipe, slot) => {
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
            return 1;
          });
        }

        if (results.length > 0) {
          return results;
        }
      }

      onHandle(recipe, handle) {
        if ((handle.fate !== 'use' && handle.fate !== '?')
            || handle.id
            || handle.connections.length === 0
            || handle.name === 'descriptions') return;

        let results = [];

        for (let otherHandle of index.findHandleMatch(handle, ['create', '?'])) {

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

          results.push((recipe, handle) => {
            let {cloneMap} = otherHandle.recipe.mergeInto(recipe);
            let mergedOtherHandle = cloneMap.get(otherHandle);
            if (!mergedOtherHandle) return null;
            while (mergedOtherHandle.connections.length > 0) {
              let [connection] = mergedOtherHandle.connections;
              connection.disconnectHandle();
              connection.connectToHandle(handle);
            }
            recipe.removeHandle(mergedOtherHandle);
            handle.fate = 'create';

            // Clear verbs and recipe name after coalescing two recipes.
            recipe.verbs.splice(0);
            recipe.name = null;

            // TODO: Merge description/patterns of both recipes.

            return 1;
          });
        }

        return results;
      }
    }(Walker.Independent), this);
  }
}
