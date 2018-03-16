// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

import {Strategy} from '../../strategizer/strategizer.js';
import RecipeWalker from '../recipe/walker.js';
import Recipe from '../recipe/recipe.js';
import RecipeUtil from '../recipe/recipe-util.js';
import assert from '../../platform/assert-web.js';

export default class ResolveRecipe extends Strategy {
  constructor(arc) {
    super();
    this._arc = arc;
  }

  async generate(strategizer) {
    let arc = this._arc;
    let results = Recipe.over(this.getResults(strategizer), new class extends RecipeWalker {
      onView(recipe, handle) {
        if (handle.connections.length == 0 || handle.id || (!handle.type) || (!handle.fate))
          return;

        const counts = RecipeUtil.directionCounts(handle);

        let mappable;

        switch (handle.fate) {
          case 'use':
            mappable = arc.findHandlesByType(handle.type, {tags: handle.tags, subtype: counts.out == 0});
            break;
          case 'map':
          case 'copy':
            mappable = arc.context.findHandlesByType(handle.type, {tags: handle.tags, subtype: true});
            break;
          case 'create':
          case '?':
            mappable = [];
            break;
          default:
            assert(false, `unexpected fate ${handle.fate}`);
        }

        mappable = mappable.filter(incomingHandle => {
          for (let existingHandle of recipe.handles)
            if (incomingHandle.id == existingHandle.id)
              return false;
          return true;
        });

        if (mappable.length == 1) {
          return (recipe, handle) => {
            handle.mapToView(mappable[0]);
          };            
        }
      }

      onSlotConnection(recipe, slotConnection) {
        if (this._slotIsConnected(slotConnection))
          return;
        
        let selectedSlots = [];
        if (!slotConnection.targetSlot)
          selectedSlots = this._findSlotCandidates(slotConnection, recipe.slots);
        
        selectedSlots = selectedSlots.concat(this._findSlotCandidates(slotConnection, arc.pec.slotComposer.getAvailableSlots()));
      
        if (selectedSlots.length !== 1)
          return;
        
        let selectedSlot = selectedSlots[0];

        return (recipe, slotConnection) => {
          if (!slotConnection.targetSlot) {
            let clonedSlot = recipe.updateToClone({selectedSlot}).selectedSlot;

            if (!clonedSlot) {
              clonedSlot = recipe.slots.find(s => selectedSlot.id && selectedSlot.id == s.id);
              if (clonedSlot == undefined)
                clonedSlot = recipe.newSlot(selectedSlot.name);
                clonedSlot.id = selectedSlot.id;
            }
            slotConnection.connectToSlot(clonedSlot);
          }

          assert(!selectedSlot.id || !slotConnection.targetSlot.id || (selectedSlot.id == slotConnection.targetSlot.id),
            `Cannot override slot id '${slotConnection.targetSlot.id}' with '${selectedSlot.id}'`);
          slotConnection.targetSlot.id = selectedSlot.id || slotConnection.targetSlot.id;

          // TODO: need to concat to existing tags and dedup?
          slotConnection.targetSlot.tags = [...selectedSlot.tags];
          return 1;
        };
      }

      _slotIsConnected(slotConnection) {
        return slotConnection.targetSlot && ((!!slotConnection.targetSlot.sourceConnection) || (!!slotConnection.targetSlot.id));
      }

      _findSlotCandidates(slotConnection, slots) {
        return slots.filter(slot => {
          if (slotConnection.slotSpec.isSet !== slot.getProvidedSlotSpec().isSet)
            return false;
          if (!this._tagsMatch(slotConnection, slot)) {
            if (slotConnection.name !== slot.name)
              return false;
          }
          if (!this._handlesMatch(slotConnection, slot))
            return false;
          return true;
        });
      }

      // TODO: replace with generic tag matcher
      _tagsMatch(slotConnection, slot) {
        let consumeConnTags = slotConnection.slotSpec.tags || [];
        let slotTags = new Set([].concat(slot.tags, slot.getProvidedSlotSpec().tags || []));
        // Consume connection tags aren't empty and intersection with the slot isn't empty.
        return consumeConnTags.length > 0 && consumeConnTags.filter(t => slotTags.has(t)).length > 0;
      }
      
      // TODO: should we move some of this logic to the recipe? Or type matching?
      _handlesMatch(slotConnection, slot) {
        let consumingParticle = slotConnection.particle;
        let providingSlotHandles = slot.handleConnections.map(connection => connection.handle);
        providingSlotHandles = providingSlotHandles.filter(a => a !== undefined);
        if (providingSlotHandles.length == 0)
          return true;
        
        return Object.values(consumingParticle.connections).find(handleConn => {
          return providingSlotHandles.includes(handleConn.handle) ||
            (handleConn.handle && handleConn.handle.id && providingSlotHandles.map(sh => sh.id).includes(handleConn.handle.id));
        });
      }

    }(RecipeWalker.Permuted), this);

    return {results, generate: null};
  }
}