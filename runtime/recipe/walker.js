// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

import {WalkerBase} from './walker-base.js';

export class Walker extends WalkerBase {
  onResult(result) {
    super.onResult(result);
    let recipe = result.result;
    let updateList = [];

    // update phase - walk through recipe and call onRecipe,
    // onHandle, etc.

    if (this.onRecipe) {
      result = this.onRecipe(recipe, result);
      if (!this.isEmptyResult(result))
        updateList.push({continuation: result});
    }
    for (let particle of recipe.particles) {
      if (this.onParticle) {
        let result = this.onParticle(recipe, particle);
        if (!this.isEmptyResult(result))
          updateList.push({continuation: result, context: particle});
      }
    }
    for (let handleConnection of recipe.handleConnections) {
      if (this.onHandleConnection) {
        let result = this.onHandleConnection(recipe, handleConnection);
        if (!this.isEmptyResult(result))
          updateList.push({continuation: result, context: handleConnection});
      }
    }
    for (let handle of recipe.handles) {
      if (this.onHandle) {
        let result = this.onHandle(recipe, handle);
        if (!this.isEmptyResult(result))
          updateList.push({continuation: result, context: handle});
      }
    }
    for (let slotConnection of recipe.slotConnections) {
      if (this.onSlotConnection) {
        let result = this.onSlotConnection(recipe, slotConnection);
        if (!this.isEmptyResult(result))
          updateList.push({continuation: result, context: slotConnection});
      }
    }
    for (let slot of recipe.slots) {
      if (this.onSlot) {
        let result = this.onSlot(recipe, slot);
        if (!this.isEmptyResult(result))
          updateList.push({continuation: result, context: slot});
      }
    }
    for (let obligation of recipe.obligations) {
      if (this.onObligation) {
        let result = this.onObligation(recipe, obligation);
        if (!this.isEmptyResult(result))
          updateList.push({continuation: result, context: obligation});
      }
    }

    this._runUpdateList(recipe, updateList);
  }
}

Walker.Permuted = WalkerBase.Permuted;
Walker.Independent = WalkerBase.Independent;
