// Copyright (c) 2018 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

import {Strategy} from '../../strategizer/strategizer.js';
import {Walker} from '../ts-build/recipe/walker.js';
import {Recipe} from '../ts-build/recipe/recipe.js';
import {RecipeUtil} from '../ts-build/recipe/recipe-util.js';
import {MapSlots} from './map-slots.js';

export class ResolveRecipe extends Strategy {
  constructor(arc) {
    super();
    this._arc = arc;
  }

  async generate(inputParams) {
    const arc = this._arc;
    return Recipe.over(this.getResults(inputParams), new class extends Walker {
      onHandle(recipe, handle) {
        if (handle.connections.length == 0 ||
            (handle.id && handle.storageKey) || (!handle.type) ||
            (!handle.fate)) {
          return;
        }

        let mappable;

        if (!handle.id) {
          // Handle doesn't have an ID, finding by type and tags.
          const counts = RecipeUtil.directionCounts(handle);
          switch (handle.fate) {
            case 'use':
              mappable = arc.findStoresByType(handle.type, {tags: handle.tags, subtype: counts.out == 0});
              break;
            case 'map':
            case 'copy':
              mappable = arc.context.findStoreByType(handle.type, {tags: handle.tags, subtype: true});
              break;
            case 'create':
            case '?':
              mappable = [];
              break;
            default:
              throw new Error(`unexpected fate ${handle.fate}`);
          }
        } else if (!handle.storageKey) {
          // Handle specified by the ID, but not yet mapped to storage.
          let storeById;
          switch (handle.fate) {
            case 'use':
              storeById = arc.findStoreById(handle.id);
              break;
            case 'map':
            case 'copy':
              storeById = arc.context.findStoreById(handle.id);
              break;
            case 'create':
            case '?':
              break;
            default:
              throw new Error(`unexpected fate ${handle.fate}`);
          }
          mappable = storeById ? [storeById] : [];
        }

        mappable = mappable.filter(incomingHandle => {
          for (const existingHandle of recipe.handles) {
            if (incomingHandle.id == existingHandle.id &&
                existingHandle !== handle) {
              return false;
            }
          }
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

        const {local, remote} = MapSlots.findAllSlotCandidates(slotConnection, arc);
        const allSlots = [...local, ...remote];

        // MapSlots handles a multi-slot case.
        if (allSlots.length !== 1) {
          return;
        }

        const selectedSlot = allSlots[0];
        return (recipe, slotConnection) => {
          MapSlots.connectSlotConnection(slotConnection, selectedSlot);
          return 1;
        };
      }

      onObligation(recipe, obligation) {
        const fromParticle = obligation.from.instance;
        const toParticle = obligation.to.instance;
        for (const fromConnection of Object.values(fromParticle.connections)) {
          for (const toConnection of Object.values(toParticle.connections)) {
            if (fromConnection.handle && fromConnection.handle == toConnection.handle) {
              return (recipe, obligation) => {
                recipe.removeObligation(obligation);
                return 1;
              };
            }
          }
        }
      }
    }(Walker.Permuted), this);
  }
}
