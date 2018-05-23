// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

import {assert} from '../../platform/assert-web.js';
import * as util from './util.js';

export class Slot {
  constructor(recipe, name) {
    assert(recipe);

    this._recipe = recipe;
    this._id = undefined; // The ID of the slot in the context
    this._localName = undefined; // Local id within the recipe
    this._name = name;
    this._tags = [];

    this._formFactor = undefined;
    this._handleConnections = []; // HandleConnection* (can only be set if source connection is set and particle in slot connections is set)
    this._sourceConnection = undefined; // SlotConnection
    this._consumeConnections = []; // SlotConnection*
  }

  get recipe() { return this._recipe; }
  get id() { return this._id; }
  set id(id) { this._id = id; }
  get localName() { return this._localName; }
  set localName(localName) { this._localName = localName; }
  get name() { return this._name; }
  set name(name) { this._name = name; }
  get tags() { return this._tags; }
  set tags(tags) { this._tags = tags; }
  get formFactor() { return this._formFactor; }
  set formFactor(formFactor) { this._formFactor = formFactor; }
  get handleConnections() { return this._handleConnections; }
  get sourceConnection() { return this._sourceConnection; }
  set sourceConnection(sourceConnection) { this._sourceConnection = sourceConnection; }
  get consumeConnections() { return this._consumeConnections; }
  getProvidedSlotSpec() {
    // TODO: should this return something that indicates this isn't available yet instead of 
    // the constructed {isSet: false, tags: []}?
    return (this.sourceConnection && this.sourceConnection.slotSpec) ? this.sourceConnection.slotSpec.getProvidedSlotSpec(this.name) : {isSet: false, tags: []};
  }

  _copyInto(recipe, cloneMap) {
    let slot = undefined;
    if (!this.sourceConnection && this.id)
      slot = recipe.findSlot(this.id);
    if (slot == undefined) {
      slot = recipe.newSlot(this.name);
      slot._id = this.id;
      slot._formFactor = this.formFactor;
      slot._localName = this._localName;
      slot._tags = [...this._tags];
      // the connections are re-established when Particles clone their attached SlotConnection objects.
      slot._sourceConnection = cloneMap.get(this._sourceConnection);
      if (slot.sourceConnection)
        slot.sourceConnection._providedSlots[slot.name] = slot;
      this._handleConnections.forEach(connection => slot._handleConnections.push(cloneMap.get(connection)));
    }
    this._consumeConnections.forEach(connection => cloneMap.get(connection).connectToSlot(slot));
    return slot;
  }

  _startNormalize() {
    this.localName = null;
    this._tags.sort();
  }

  _finishNormalize() {
    assert(Object.isFrozen(this._source));
    this._consumeConnections.forEach(cc => assert(Object.isFrozen(cc)));
    this._consumeConnections.sort(util.compareComparables);
    Object.freeze(this);
  }

  _compareTo(other) {
    let cmp;
    if ((cmp = util.compareStrings(this.id, other.id)) != 0) return cmp;
    if ((cmp = util.compareStrings(this.localName, other.localName)) != 0) return cmp;
    if ((cmp = util.compareStrings(this.formFactor, other.formFactor)) != 0) return cmp;
    if ((cmp = util.compareArrays(this._tags, other._tags, util.compareStrings)) != 0) return cmp;
    return 0;
  }

  removeConsumeConnection(slotConnection) {
    let idx = this._consumeConnections.indexOf(slotConnection);
    assert(idx > -1);
    this._consumeConnections.splice(idx, 1);
    if (this._consumeConnections.length == 0)
      this.remove();
  }

  remove() {
    this._recipe.removeSlot(this);
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

  _isValid(options) {
    // TODO: implement
    return true;
  }

  toString(nameMap, options) {
    let result = [];
    result.push('slot');
    if (this.id) {
      result.push(`'${this.id}'`);
    }
    if (this.tags.length > 0) {
      result.push(this.tags.join(' '));
    }
    result.push(`as ${(nameMap && nameMap.get(this)) || this.localName}`);
    let includeUnresolved = options && options.showUnresolved && !this.isResolved(options);
    if (includeUnresolved) {
      result.push(`// unresolved slot: ${options.details}`);
    }

    if (this.id || includeUnresolved) {
      return result.join(' ');
    }
  }
}
