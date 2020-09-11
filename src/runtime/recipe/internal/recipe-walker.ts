/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {HandleConnectionSpec, ConsumeSlotConnectionSpec} from '../../arcs-types/particle-spec.js';

import {Recipe, Particle, HandleConnection, Slot, Handle, SlotConnection, ConnectionConstraint} from './recipe-interface.js';
import {Walker, Descendant, Continuation} from '../../../utils/lib-utils.js';

export class RecipeWalker extends Walker<Recipe> {

  // Optional lifecycle events
  onRecipe?(recipe: Recipe): Continuation<Recipe, []>;
  onHandle?(recipe: Recipe, handle: Handle): Continuation<Recipe, [Handle]>;
  onPotentialHandleConnection?(recipe: Recipe, particle: Particle, connectionSpec: HandleConnectionSpec): Continuation<Recipe, [Particle, HandleConnectionSpec]>;
  onHandleConnection?(recipe: Recipe, handleConnection: HandleConnection): Continuation<Recipe, [HandleConnection]>;
  onParticle?(recipe: Recipe, particle: Particle): Continuation<Recipe, [Particle]>;
  onPotentialSlotConnection?(recipe: Recipe, particle: Particle, slotSpec: ConsumeSlotConnectionSpec): Continuation<Recipe, [Particle, ConsumeSlotConnectionSpec]>;
  onSlotConnection?(recipe: Recipe, slotConnection: SlotConnection): Continuation<Recipe, [SlotConnection]>;
  onSlot?(recipe: Recipe, slot: Slot): Continuation<Recipe, [Slot]>;
  onObligation?(recipe: Recipe, obligation: ConnectionConstraint): Continuation<Recipe, [ConnectionConstraint]>;
  onRequiredParticle?(recipe: Recipe, particle: Particle): Continuation<Recipe, [Particle]>;

  onResult(result: Descendant<Recipe>) {
    super.onResult(result);
    const recipe: Recipe = result.result;

    if (this.onRecipe) {
      this.visit(this.onRecipe.bind(this));
    }

    if (this.onParticle) {
      for (const particle of recipe.particles) {
        this.visit(this.onParticle.bind(this), particle);
      }
    }

    if (this.onPotentialHandleConnection) {
      for (const particle of recipe.particles) {
        if (particle.spec) {
          for (const connectionSpec of particle.spec.handleConnectionMap.values()) {
            if (particle.connections[connectionSpec.name]) {
              continue;
            }
            this.visit(this.onPotentialHandleConnection.bind(this), particle, connectionSpec);
          }
        }
      }
    }

    if (this.onHandleConnection) {
      for (const handleConnection of recipe.handleConnections) {
        this.visit(this.onHandleConnection.bind(this), handleConnection);
      }
    }
    if (this.onHandle) {
      for (const handle of recipe.handles) {
        this.visit(this.onHandle.bind(this), handle);
      }
    }
    if (this.onPotentialSlotConnection) {
      for (const particle of recipe.particles) {
        for (const slotSpec of particle.getUnboundSlotConnections()) {
          this.visit(this.onPotentialSlotConnection.bind(this), particle, slotSpec);
        }
      }
    }

    if (this.onSlotConnection) {
      for (const slotConnection of recipe.slotConnections) {
        this.visit(this.onSlotConnection.bind(this), slotConnection);
      }
    }
    if (this.onSlot) {
      for (const slot of recipe.slots) {
        this.visit(this.onSlot.bind(this), slot);
      }
    }
    if (this.onObligation) {
      for (const obligation of recipe.obligations) {
        this.visit(this.onObligation.bind(this), obligation);
      }
    }
    if (this.onRequiredParticle) {
      for (const require of recipe.requires) {
        for (const particle of require.particles) {
          this.visit(this.onRequiredParticle.bind(this), particle);
        }
      }
    }
  }

  createDescendant(recipe: Recipe, score: number): void {
    const valid = recipe.normalize();
    const hash = valid ? recipe.digest() : null;
    super.createWalkerDescendant(recipe, score, hash, valid);
  }
}

