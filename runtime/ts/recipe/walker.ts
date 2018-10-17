// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

import {WalkerBase, WalkerTactic} from './walker-base.js';

export class Walker extends WalkerBase {
  // tslint:disable-next-line: variable-name
  static Permuted: WalkerTactic;
  // tslint:disable-next-line: variable-name
  static Independent: WalkerTactic;
  onResult(result) {
    super.onResult(result);
    const recipe = result.result;
    const updateList = [];

    // update phase - walk through recipe and call onRecipe,
    // onHandle, etc.

    if (this.onRecipe) {
      result = this.onRecipe(recipe, result);
      if (!this.isEmptyResult(result)) {
        updateList.push({continuation: result});
      }
    }
    for (const particle of recipe.particles) {
      if (this.onParticle) {
        const result = this.onParticle(recipe, particle);
        if (!this.isEmptyResult(result)) {
          updateList.push({continuation: result, context: particle});
        }
      }
    }
    for (const handleConnection of recipe.handleConnections) {
      if (this.onHandleConnection) {
        const result = this.onHandleConnection(recipe, handleConnection);
        if (!this.isEmptyResult(result)) {
          updateList.push({continuation: result, context: handleConnection});
        }
      }
    }
    for (const handle of recipe.handles) {
      if (this.onHandle) {
        const result = this.onHandle(recipe, handle);
        if (!this.isEmptyResult(result)) {
          updateList.push({continuation: result, context: handle});
        }
      }
    }
    for (const slotConnection of recipe.slotConnections) {
      if (this.onSlotConnection) {
        const result = this.onSlotConnection(recipe, slotConnection);
        if (!this.isEmptyResult(result)) {
          updateList.push({continuation: result, context: slotConnection});
        }
      }
    }
    for (const slot of recipe.slots) {
      if (this.onSlot) {
        const result = this.onSlot(recipe, slot);
        if (!this.isEmptyResult(result)) {
          updateList.push({continuation: result, context: slot});
        }
      }
    }
    for (const obligation of recipe.obligations) {
      if (this.onObligation) {
        const result = this.onObligation(recipe, obligation);
        if (!this.isEmptyResult(result)) {
          updateList.push({continuation: result, context: obligation});
        }
      }
    }

    this._runUpdateList(recipe, updateList);
  }
}

Walker.Permuted = WalkerTactic.Permuted;
Walker.Independent = WalkerTactic.Independent;
