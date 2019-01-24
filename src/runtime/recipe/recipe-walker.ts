// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

import {ConnectionConstraint} from './connection-constraint.js';
import {Handle} from './handle.js';
import {HandleConnection} from './handle-connection.js';
import {Particle} from './particle.js';
import {Recipe} from './recipe.js';
import {Slot} from './slot.js';
import {SlotConnection} from './slot-connection.js';
import {SlotSpec} from '../particle-spec';
import {Walker, WalkerTactic} from './walker.js';

export class RecipeWalker extends Walker {

  // Optional lifecycle events

  // tslint:disable-next-line: no-any
  onHandle?(recipe: Recipe, handle: Handle): any;
  // tslint:disable-next-line: no-any
  onHandleConnection?(recipe: Recipe, handleConnection: HandleConnection): any;
  // tslint:disable-next-line: no-any
  onParticle?(recipe: Recipe, particle: Particle): any;
  // tslint:disable-next-line: no-any
  onRecipe?(recipe: Recipe, result): any;
  // tslint:disable-next-line: no-any
  onPotentialSlotConnection?(recipe: Recipe, particle: Particle, slotSpec: SlotSpec): any;
  // tslint:disable-next-line: no-any
  onSlotConnection?(recipe: Recipe, slotConnection: SlotConnection): any;
  // tslint:disable-next-line: no-any
  onSlot?(recipe: Recipe, slot: Slot): any;
  // tslint:disable-next-line: no-any
  onObligation?(recipe: Recipe, obligation: ConnectionConstraint): any;

  onResult(result) {
    super.onResult(result);
    const recipe: Recipe = result.result;
    const updateList = [];

    // update phase - walk through recipe and call onRecipe,
    // onHandle, etc.

    // TODO overriding the argument with a local variable is very confusing.
    if (this.onRecipe) {
      result = this.onRecipe(recipe, result);
      if (!this.isEmptyResult(result)) {
        updateList.push({continuation: result});
      }
    }
    for (const particle of recipe.particles) {
      if (this.onParticle) {
        const context: [Particle] = [particle];
        const result = this.onParticle(recipe, ...context);
        if (!this.isEmptyResult(result)) {
          updateList.push({continuation: result, context});
        }
      }
    }
    for (const handleConnection of recipe.handleConnections) {
      if (this.onHandleConnection) {
        const context: [HandleConnection] = [handleConnection];
        const result = this.onHandleConnection(recipe, ...context);
        if (!this.isEmptyResult(result)) {
          updateList.push({continuation: result, context});
        }
      }
    }
    for (const handle of recipe.handles) {
      if (this.onHandle) {
        const context: [Handle] = [handle];
        const result = this.onHandle(recipe, ...context);
        if (!this.isEmptyResult(result)) {
          updateList.push({continuation: result, context});
        }
      }
    }
    if (this.onPotentialSlotConnection) {
      for (const particle of recipe.particles) {
        for (const [name, slotSpec] of particle.getSlotSpecs()) {
          if (particle.getSlotConnectionByName(name)) continue;
          const context: [Particle, SlotSpec] = [particle, slotSpec];
          const result = this.onPotentialSlotConnection(recipe, ...context);
          if (!this.isEmptyResult(result)) {
            updateList.push({continuation: result, context});
          }
        }
      }
    }

    if (this.onSlotConnection) {
      for (const slotConnection of recipe.slotConnections) {
        const context: [SlotConnection] = [slotConnection];
        const result = this.onSlotConnection(recipe, ...context);
        if (!this.isEmptyResult(result)) {
          updateList.push({continuation: result, context});
        }
      }
    }
    for (const slot of recipe.slots) {
      if (this.onSlot) {
        const context: [Slot] = [slot];
        const result = this.onSlot(recipe, ...context);
        if (!this.isEmptyResult(result)) {
          updateList.push({continuation: result, context});
        }
      }
    }
    for (const obligation of recipe.obligations) {
      if (this.onObligation) {
        const context: [ConnectionConstraint] = [obligation];
        const result = this.onObligation(recipe, ...context);
        if (!this.isEmptyResult(result)) {
          updateList.push({continuation: result, context});
        }
      }
    }

    this._runUpdateList(recipe, updateList);
  }

  createDescendant(recipe, score): void {
    const valid = recipe.normalize();
    const hash = valid ? recipe.digest() : null;
    super.createWalkerDescendant(recipe, score, hash, valid);
  }
  
}

