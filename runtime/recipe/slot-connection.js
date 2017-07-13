// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

var assert = require('assert');
var util = require('./util.js');

class SlotConnection {
  constructor(name, direction, particle) {
    assert(particle);
    assert(particle.recipe);
    this._recipe = particle.recipe;
    this._name = name;  // name is unique across same Particle's provided slots.
    this._slot = undefined;
    this._particle = particle;  // consumer / provider
    this._tags = []
    this._viewConnections = [];
    this._direction = direction;
    this._formFactors = [];
    this._required = true;  // TODO: support optional slots; currently every slot is required.
  }

  clone(particle, cloneMap) {
    var slotConnection = new SlotConnection(this._name, this._direction, particle);
    slotConnection._tags = [...this._tags];
    slotConnection._formFactors = [...this._formFactors];
    slotConnection._required = this._required;
    if (this._slot != undefined) {
      slotConnection.connectToSlot(cloneMap.get(this._slot));
    }
    this._viewConnections.forEach(viewConn => slotConnection._viewConnections.push(viewConn.clone(particle, cloneMap)));
    cloneMap.set(this, slotConnection);
    return slotConnection;
  }

  _normalize() {
    this._tags.sort();
    this._formFactors.sort();
    Object.freeze(this);
  }

  _compareTo(other) {
    let cmp;
    if ((cmp = util.compareComparables(this._slot, other._slot)) != 0) return cmp;
    if ((cmp = util.compareComparables(this._particle, other._particle)) != 0) return cmp;
    if ((cmp = util.compareStrings(this._name, other._name)) != 0) return cmp;
    if ((cmp = base.compreArrays(this._tags, other._tags, util.compareStrings)) != 0) return cmp;
    if ((cmp = util.compareStrings(this._direction, other._direction)) != 0) return cmp;
    if ((cmp = util.compareArrays(this._formFactors, other._formFactors, util.compareStrings)) != 0) return cmp;
    if ((cmp = util.compareBools(this._required, other._required)) != 0) return cmp;
    // viewConnections?
    return 0;
  }

  // TODO: slot functors??
  get recipe() { return this._recipe; }
  get name() { return this._name; }
  get tags() { return this._tags; }
  get viewConnections() { return this._viewConnections; } // ViewConnection*
  get direction() { return this._direction; } // provide/consume
  get formFactors() { return this._formFactors; } // string*
  get required() { return this._required; } // bool
  get slot() { return this._slot; } // Slot?
  get particle() { return this._particle; } // Particle

  connectToView(name) {
    assert(this.particle.connections[name], `Cannot connect slot to nonexistent view parameter ${name}`);
    this._viewConnections.push(this.particle.connections[name]);
  }

  connectToSlot(slot) {
    assert(this.recipe == slot.recipe, "Cannot connect to slot from non matching recipe");
    assert(!this._slot, "Cannot override slot connection");
    this._slot = slot;
    if (this.direction == "provide") {
      assert(this._slot.providerConnection == undefined, "Cannot override Slot provider");
      this._slot._providerConnection = this;
    } else if (this.direction == "consume") {
      this._slot._consumerConnections.push(this);
    } else {
      fail(`Unsupported direction ${this.direction}`);
    }
  }

  isResolved() {
    return this.slot && this.slot.isResolved();
  }

  toString(nameMap) {
    let result = [];
    result.push(this.direction == "provide" ? "provides" : "consumes");
    result.push(this.name);
    if (this.slot) {
      result.push(`as ${(nameMap && nameMap.get(this.slot)) || this.slot.localName}`);
    }
    result.push(...this.tags);
    result.push(...this.formFactors);
    return result.join(' ');
  }
}

module.exports = SlotConnection;
