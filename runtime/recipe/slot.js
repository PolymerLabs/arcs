// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

var assert = require('assert');
var util = require('./util.js');

class Slot {
  constructor(recipe) {
    assert(recipe);

    this._recipe = recipe;
    this._id = undefined;          // The ID of the slot in the context
    this._localName = undefined;   // Local id within the recipe

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
  get formFactor() { return this._formFactor; }
  set formFactor(formFactor) { this._formFactor = formFactor; }
  get viewConnections() { return this._viewConnections; }
  get sourceConnection() { return this._sourceConnection; }
  set sourceConnection(sourceConnection) { this._sourceConnection = sourceConnection; }
  get consumeConnections() { return this._consumerConnections; }

  clone(recipe, cloneMap) {
    var slot = new Slot(recipe);
    slot._id = this.id;
    slot._formFactor = this.formFactor;
    // the connections are re-established when Particles clone their attached SlotConnection objects.
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

  isResolved() {
    // TODO: implement
    return true;
  }

  _isValid() {
    // TODO: implement
    return true;
  }

  toString(nameMap) {
    if (this.id)
      return `slot '${this.id}' as ${(nameMap && nameMap.get(this)) || this.localName}`;

  }
}

module.exports = Slot;
