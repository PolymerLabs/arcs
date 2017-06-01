/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
"use strict";

const assert = require('assert');
const Slot = require('./slot-dom.js');

let log = !global.document || (global.logging === false) ? () => {} : (...args) => { console.log.apply(console, args); };

class SlotManager {
  constructor(domRoot, pec) {
    this._slotBySlotId = new Map();
    // Contains both fulfilled slots and pending requests. 
    this._slotIdByParticleSpec = new Map();
    this._pec = pec;
    this._createSlot('root').initialize(domRoot, /* exposedView= */ undefined);
  }
  _getOrCreateSlot(slotid) {
    if (!this._slotBySlotId.has(slotid)) {
      return this._createSlot(slotid);
    }
    return this._slotBySlotId.get(slotid);
  }
  _createSlot(slotid) {
    let slot = new Slot(slotid);
    this._slotBySlotId.set(slotid, slot);
    return slot;
  }
  hasSlot(slotid) {
    return this._slotBySlotId.has(slotid);
  }
  _getSlot(slotid) {
    assert(this._slotBySlotId.has(slotid));
    return this._slotBySlotId.get(slotid);
  }
  _getParticleSlot(particleSpec) {
    if (this._slotIdByParticleSpec.has(particleSpec))
      return this._getSlot(this._slotIdByParticleSpec.get(particleSpec));
  }
  registerParticle(particleSpec, slotid) {
    return new Promise((resolve, reject) => {
      try {
        let slot = this._getOrCreateSlot(slotid);
        this._slotIdByParticleSpec.set(particleSpec, slotid);
        if (slot.isAvailable()) {
          resolve(slot);
        } else {
          slot.addPendingRequest(particleSpec, resolve, reject);
        }
      } catch(x) {
        // TODO(sjmiles): my Promise-fu is not strong, probably should do something else
        reject(x);
      }
    }).then(slot => { slot.assignParticle(particleSpec); });
  }
  renderContent(particleSpec, content, handler) {
    let slot = this._getParticleSlot(particleSpec);
    // returns slot(id)s rendered by the particle
    let innerSlotInfos = slot.render(content, handler);
    if (innerSlotInfos) {
      // the `innerSlotInfos` identify available slot-contexts, make them available for composition
      this._provideInnerSlots(innerSlotInfos, particleSpec);
    }
  }
  _provideInnerSlots(innerSlotInfos, particleSpec) {
    innerSlotInfos.forEach(info => {
      let inner = this._getOrCreateSlot(info.id);
      // TODO(sjmiles): initialization will destroy content for DomSlot subclass, so we must cache it first
      // ... this is a leaky implementation detail
      let originalContent = inner.content;
      inner.initialize(info.context, particleSpec.exposeMap.get(info.id));
      if (inner.hasParticle()) {
        // TODO(sjmiles): recurses
        this.renderContent(inner.particleSpec, originalContent);
      } else {
        inner.providePendingSlot();
      }
    });
  }
  // particleSpec is relinquishing ownership of it's slot
  releaseParticle(particleSpec) {
    let slot = this._getParticleSlot(particleSpec);
    // particleSpec is mapped to slotid, hence it is either assigned or pending.
    if (slot && slot.particleSpec == particleSpec) {
      this._disassociateSlotFromParticle(slot);
      return this._derenderContent(slot);
    } else slot.removePendingRequest(particleSpec);
  }
  _derenderContent(slot) {
    // teardown rendering
    let lostInfos = slot.derender();
    // memoize list of particles who lost slots and remove old slots
    let affectedParticles = lostInfos.map(s => {
      let slot = this._getSlot(s.id);
      let particleSpec = slot.particleSpec;  // keep particleSpec before it was destroyed by _removeSlot.
      this._removeSlot(slot);
      return particleSpec;
    });
    log(`slot-manager::_derenderContent("${slot.slotid}"):`, affectedParticles);
    // released slot is now available for another requester
    slot.providePendingSlot();
    // return list of particles who lost slots
    return affectedParticles;
  }
  _disassociateSlotFromParticle(slot) {
    this._slotIdByParticleSpec.delete(slot.particleSpec);
    slot.unassignParticle();
  }
  // `remove` means to evacipate the slot context (`release` otoh means only to mark the slot as unused)
  _removeSlot(slot) {
    if (slot.hasParticle()) {
      this._disassociateSlotFromParticle(slot);
    }
    slot.uninitialize();
    this._slotBySlotId.delete(slot.slotid);
  }
}

module.exports = SlotManager;
