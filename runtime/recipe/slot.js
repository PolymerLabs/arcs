// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

import assert from '../../platform/assert-web.js';
import util from './util.js';

class Slot {
  constructor(recipe, name) {
    assert(recipe);

    this._recipe = recipe;
    this._id = undefined;          // The ID of the slot in the context
    this._localName = undefined;   // Local id within the recipe
    this._name = name;

    this._formFactor = undefined;
    this._viewConnections = [];  // ViewConnection* (can only be set if source connection is set and particle in slot connections is set)
    this._sourceConnection = undefined;  // SlotConnection
    this._consumerConnections = [];  // SlotConnection*
  }

  get recipe() { return this._recipe; }
  get id() { return this._id; }
  set id(id) { this._id = id; }
  get localName() { return this._localName; }
  set localName(localName) { this._localName = localName; }
  get name() { return this._name; };
  set name(name) { this._name = name; };
  get formFactor() { return this._formFactor; }
  set formFactor(formFactor) { this._formFactor = formFactor; }
  get viewConnections() { return this._viewConnections; }
  get sourceConnection() { return this._sourceConnection; }
  set sourceConnection(sourceConnection) { this._sourceConnection = sourceConnection; }
  get consumeConnections() { return this._consumerConnections; }

  _copyInto(recipe, cloneMap) {
    var slot = undefined;
    if (!this.sourceConnection && this.id)
      slot = recipe.findSlot(this.id);
    if (slot == undefined) {
      var slot = recipe.newSlot(this.name);
      slot._id = this.id;
      slot._formFactor = this.formFactor;
      slot._localName = this._localName;
      // the connections are re-established when Particles clone their attached SlotConnection objects.
      slot._sourceConnection = cloneMap.get(this._sourceConnection);
      if (slot.sourceConnection)
        slot.sourceConnection._providedSlots[slot.name] = slot;
      this._viewConnections.forEach(connection => slot._viewConnections.push(cloneMap.get(connection)));
    }
    this._consumerConnections.forEach(connection => cloneMap.get(connection).connectToSlot(slot));
    return slot;
  }

  _startNormalize() {
    this.localName = null;
  }

  _finishNormalize() {
    assert(Object.isFrozen(this._source));
    this._consumerConnections.forEach(cc => assert(Object.isFrozen(cc)));
    this._consumerConnections.sort(util.compareComparables);
    Object.freeze(this);
  }

  _compareTo(other) {
    let cmp;
    if ((cmp = util.compareStrings(this.id, other.id)) != 0) return cmp;
    if ((cmp = util.compareStrings(this.localName, other.localName)) != 0) return cmp;
    if ((cmp = util.compareStrings(this.formFactor, other.formFactor)) != 0) return cmp;
    return 0;
  }

  isResolved(options) {
    assert(Object.isFrozen(this));

    if (options && options.showUnresolved) {
      options.details = [];
      if (!this._sourceConnection) {
        options.details.push('missing source-connection');
      }
      if (!this.id) {
        options.details.push('missing id');
      }
      options.details = options.details.join('; ');
    }

    return this._sourceConnection || this.id;
  }

  _isValid() {
    // TODO: implement
    return true;
  }

  toString(nameMap, options) {
    let result = [];
    if (this.id) {
      result.push(`slot '${this.id}' as ${(nameMap && nameMap.get(this)) || this.localName}`);
      if (options && options.showUnresolved) {
        if (!this.isResolved(options)) {
          result.push(`# unresolved slot: ${options.details}`);
        }
      }
    }
    else if (options && options.showUnresolved && !this.isResolved(options)) {
      result.push(`slot as ${(nameMap && nameMap.get(this)) || this.localName} # unresolved slot: ${options.details}`);
    }
    return result.join(' ');
  }
}

export default Slot;
