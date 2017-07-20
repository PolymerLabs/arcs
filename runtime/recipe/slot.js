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
    if (!!this.id) {
      return false;
    }
    if (this.providerConnection) {
      if (providerConnection.viewConnections.length == 0) {
        // The providing particle doesn't restrict view generated in this slot.
        return true;
      }
      for (let provideViewConn of providerConnection.viewConnections) {
        // The consuming slots must ALL comply with either of the view connections enforced by the providing particle.
        return this.consumerConnections.every(c => c.particle && Array.from[c.particles.connection.values].find(v => v.id == provideViewConn.id));
      }
    } else {
      // Note: "root" slot doesn't have a "provide" connection, hence it must have "consume" connections.
      return this.consumerConnections.length > 0;
    }
  }

  _isValid() {
    // TODO: implement
    return true;
  }

  toString(nameMap) {
    return '';
  }
}

module.exports = Slot;
