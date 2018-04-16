// Copyright (c) 2018 Google Inc. All rights reserved.
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
import MapSlots from './map-slots.js';

export default class ResolveRecipe extends Strategy {
  constructor(arc) {
    super();
    this._arc = arc;
  }

  async generate(inputParams) {
    let arc = this._arc;
    return Recipe.over(this.getResults(inputParams), new class extends RecipeWalker {
      onHandle(recipe, handle) {
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
            mappable = arc.context.findStorageByType(handle.type, {tags: handle.tags, subtype: true});
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
            handle.mapToStorage(mappable[0]);
          };
        }
      }

      onSlotConnection(recipe, slotConnection) {
        if (slotConnection.isConnected()) {
          return;
        }

        let selectedSlots = MapSlots.findAllSlotCandidates(slotConnection, arc);
        if (selectedSlots.length !== 1) {
          return;
        }

        let selectedSlot = selectedSlots[0];

        return (recipe, slotConnection) => {
          MapSlots.connectSlotConnection(slotConnection, selectedSlot);
          return 1;
        };
      }
    }(RecipeWalker.Permuted), this);
  }
}
