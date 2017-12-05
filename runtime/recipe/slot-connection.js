// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

import assert from '../../platform/assert-web.js';
import util from './util.js';

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
    slotSpec.providedSlots.forEach(providedSlot => {
      let slot = this.providedSlots[providedSlot.name];
      if (slot == undefined) {
        slot = this.recipe.newSlot(providedSlot.name);
        slot._sourceConnection = this;
        slot._name = providedSlot.name;
        this.providedSlots[providedSlot.name] = slot;
      }
      assert(slot.viewConnections.length == 0, "View connections must be empty");
      providedSlot.views.forEach(view => slot.viewConnections.push(this.particle.connections[view]));
      assert(slot._name == providedSlot.name);
      assert(!slot.formFactor);
      slot.formFactor = providedSlot.formFactor;
    });
  }

  connectToSlot(targetSlot) {
    assert(targetSlot);
    assert(!this.targetSlot);
    assert(this.recipe == targetSlot.recipe, 'Cannot connect to slot from different recipe');

    this._targetSlot = targetSlot;
    targetSlot.consumeConnections.push(this);
  }

  _clone(particle, cloneMap) {
    if (cloneMap.has(this)) {
      return cloneMap.get(this);
    }

    var slotConnection = particle.addSlotConnection(this.name);
    if (this.slotSpec) {
      slotConnection._slotSpec = particle.spec.getSlotSpec(this.name);
    }

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
    if (this._targetSlot && this._targetSlot.sourceConnection &&
        this._targetSlot != this._targetSlot.sourceConnection.providedSlots[this._targetSlot.name]) {
      return false;
    }

    // TODO: add more checks.
    return true;
  }

  isResolved(options) {
    assert(Object.isFrozen(this));

    if (!this.name) {
      if (options) {
        options.details = "missing name";
      }
      return false;
    }
    if (!this.particle) {
      if (options) {
        options.details = "missing particle";
      }
      return false;
    }
    if (!this.targetSlot) {
      if (options) {
        options.details = "missing target-slot";
      }
      return false;
    }
    if (this.slotSpec.isRequired && this.targetSlot.sourceConnection == undefined) {
      if (options) {
        options.details = "missing target-slot's source-connection of required connection";
      }
      return false;
    }
    return true;
  }

  toString(nameMap, options) {
    let consumeRes = [];
    consumeRes.push('consume');
    if (this.slotSpec.isSet) {
      consumeRes.push('set of');
    }
    consumeRes.push(`${this.name}`);
    if (this.targetSlot)
      consumeRes.push(`as ${(nameMap && nameMap.get(this.targetSlot)) || this.targetSlot.localName}`);

    if (options && options.showUnresolved) {
      if (!this.isResolved(options)) {
        consumeRes.push(`# unresolved slot-connection: ${options.details}`);
      }
    }

    let result = [];
    result.push(consumeRes.join(" "));

    Object.keys(this.providedSlots).forEach(psName => {
      let providedSlot = this.providedSlots[psName];
      let provideRes = [];
      provideRes.push('  provide');
      let providedSlotSpec = this.slotSpec.providedSlots.find(ps => ps.name == psName);
      assert(providedSlotSpec, `Cannot find providedSlotSpec for ${psName}`);
      if (providedSlotSpec.isSet) {
        provideRes.push('set of');
      }
      provideRes.push(`${psName} as ${(nameMap && nameMap.get(providedSlot)) || providedSlot}`);
      result.push(provideRes.join(" "));
    });
    return result.join("\n");
  }
}

export default SlotConnection;
