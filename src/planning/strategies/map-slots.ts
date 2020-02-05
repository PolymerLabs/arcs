/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {ConsumeSlotConnectionSpec} from '../../runtime/particle-spec.js';
import {Particle} from '../../runtime/recipe/particle.js';
import {Recipe} from '../../runtime/recipe/recipe.js';
import {SlotConnection} from '../../runtime/recipe/slot-connection.js';
import {SlotUtils} from '../../runtime/recipe/slot-utils.js';
import {StrategizerWalker, Strategy} from '../strategizer.js';

export class MapSlots extends Strategy {
  async generate(inputParams) {
    const arc = this.arc;

    return StrategizerWalker.over(this.getResults(inputParams), new class extends StrategizerWalker {
      onPotentialSlotConnection(recipe: Recipe, particle: Particle, slotSpec: ConsumeSlotConnectionSpec) {
        const {local, remote} = SlotUtils.findAllSlotCandidates(particle, slotSpec, arc);
        // ResolveRecipe handles one-slot case.
        if (local.length + remote.length < 2) {
          return undefined;
        }

        // If there are any local slots, prefer them over remote slots.
        // TODO: There should not be any preference over local slots vs. remote slots.
        // Strategies should be responsible for making all possible recipes. Ranking of
        // recipes is done later.
        const slotList = local.length > 0 ? local : remote;
        return slotList.map(slot => ((recipe: Recipe, particle: Particle, slotSpec: ConsumeSlotConnectionSpec) => {
          const newSlotConnection = particle.addSlotConnection(slotSpec.name);
          SlotUtils.connectSlotConnection(newSlotConnection, slot);
          return 1;
        }));
      }

      // TODO: this deals with cases where a SlotConnection has been
      // created during parsing, so that provided slots inside the
      // connection can be connected to consume connections.
      // Long term, we shouldn't have to do this, so we won't need
      // to deal with the case of a disconnected SlotConnection.
      onSlotConnection(recipe: Recipe, slotConnection: SlotConnection) {
        // don't try to connect verb constraints
        // TODO: is this right? Should constraints be connectible, in order to precompute the
        // recipe side once the verb is substituted?
        if (slotConnection.getSlotSpec() == undefined) {
          return undefined;
        }

        if (slotConnection.isConnected()) {
          return;
        }
        const slotSpec = slotConnection.getSlotSpec();
        const particle = slotConnection.particle;

        const {local, remote} = SlotUtils.findAllSlotCandidates(particle, slotSpec, arc);
        if (local.length + remote.length < 2) {
          return undefined;
        }

        // If there are any local slots, prefer them over remote slots.
        const slotList = local.length > 0 ? local : remote;
        return slotList.map(slot => ((recipe, slotConnection) => {
          SlotUtils.connectSlotConnection(slotConnection, slot);
          return 1;
        }));
      }
    }(StrategizerWalker.Permuted), this);
  }

}
