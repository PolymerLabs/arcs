// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

var assert = require('assert');
var util = require('./util.js');

class SlotConnection {
  constructor(name, particle) {
    assert(particle);
    assert(particle.recipe);
    assert(name);

    this._recipe = particle.recipe;
    this._particle = particle;
    this._name = name;
    this._slotSpec = undefined;  // isRequired + formFactor
    this._targetSlot = undefined;  // Slot?
    this._providedSlots = {};      // Slot*
  }

  get recipe() { return this._recipe; }
  get particle() { return this._particle; }
  get name() { return this._name; }
  get slotSpec() { return this._slotSpec; }
  get targetSlot() { return this._targetSlot; }
  get providedSlots() { return this._providedSlots; }

  set slotSpec(slotSpec) {
    assert(this.name == slotSpec.name);
    this._slotSpec = slotSpec;
  }

  connectToSlot(targetSlot) {
    assert(targetSlot);
    assert(!this.targetSlot);
    assert(this.recipe == targetSlot.recipe, 'Cannot connect to slot from different recipe');

    this._targetSlot = targetSlot;
    targetSlot.consumeConnections.push(this);
  }

  clone(particle, cloneMap) {
    if (cloneMap.has(this)) {
      return cloneMap.get(this);
    }
    var slotConnection = new SlotConnection(this.name, particle);
    if (this.slotSpec) {
      slotConnection.slotSpec = particle.spec.getSlotSpec(this.name);
    }
    if (this.targetSlot) {
      slotConnection.connectToSlot(cloneMap.get(this.targetSlot));
    }
    Object.keys(this.providedSlots).forEach(ps => {
      slotConnection.providedSlots[ps] = cloneMap.get(this.providedSlots[ps]);
    });

    cloneMap.set(this, slotConnection);
    return slotConnection;
  }

  _normalize() {
    let normalizedSlots = {};
    for (let key of (Object.keys(this._providedSlots).sort())) {
      normalizedSlots[key] = this._providedSlots[key];
    }
    this._providedSlots = normalizedSlots;
    Object.freeze(this);
  }

  _compareTo(other) {
    let cmp;
    if ((cmp = util.compareStrings(this.name, other.name)) != 0) return cmp;
    if ((cmp = util.compareComparables(this._targetSlot, other._targetSlot)) != 0) return cmp;
    if ((cmp = util.compareComparables(this._particle, other._particle)) != 0) return cmp;
    return 0;
  }

  _isValid() {
    // TODO: implement
    return true;
  }

  isResolved() {
    if (!this.name || !this.particle || !this.targetSlot)
      return false;
    if (this.slotSpec.isRequired && this.targetSlot.sourceConnection == undefined)
      return false;
    return true;
  }

  toString(nameMap) {
    let result = [];
    if (this.targetSlot)
      result.push(`consume ${this.name} as ${(nameMap && nameMap.get(this.targetSlot)) || this.targetSlot.localName}`)
    else
      result.push(`consume ${this.name}`);

    Object.keys(this.providedSlots).forEach(psName => {
      result.push(`  provide ${psName} as ${(nameMap && nameMap.get(this.providedSlots[psName])) || this.providedSlots[psName]}`);
    })
    return result.join("\n");
  }
}

module.exports = SlotConnection;
