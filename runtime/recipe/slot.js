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
    this._id = undefined;
    this._localName = undefined;
    this._providerConnection = undefined;
    this._consumerConnections = [];
  }

  clone(recipe, cloneMap) {
    var slot = new Slot(recipe);
    slot._id = this._id;
    // the connections are re-established when Particles clone their attached SlotConnection objects.
    return slot;
  }

  _startNormalize() {
    this._localName = null;
  }

  _finishNormalize() {
    assert(Object.isFrozen(this._providerConnection));
    for (let consumerConn of this._consumerConnections) {
      assert(Object.isFrozen(consumerConn));
    }
    this._consumerConnections.sort(util.compareComparables);
    Object.freeze(this);
  }

  _compareTo(other) {
    let cmp;
    if ((cmp = util.compareStrings(this._id, other._id)) != 0) return cmp;
    if ((cmp = util.compareStrings(this._localName, other._localName)) != 0) return cmp;
    return 1;
  }

  get recipe() { return this._recipe; }
  get id() { return this._id; }
  set id(id) { this._id = id; }
  get localName() { return this._localName; }
  set localName(name) { this._localName = name; }
  get providerConnection() { return this._providerConnection; }
  get consumerConnections() { return this._consumerConnections; }

  isResolved() {
    // Note: "root" slot doesn't have a "provide" connection, hence it must have "consume" connections.
    return !!this.id && (!!this.providerConnection || this.consumerConnections.length > 0);
  }

  toString(nameMap) {
    let result = [];
    result.push("renders");
    if (this.providerConnection && this.providerConnection.viewConnections.length > 0 &&
        this.providerConnection.viewConnections[0].view) {
      result.push(nameMap.get(this.providerConnection.viewConnections[0].view));
    }
    result.push(`as ${(nameMap && nameMap.get(this)) || this.localName}`);
    return result.join(' ');
  }
}

module.exports = Slot;
