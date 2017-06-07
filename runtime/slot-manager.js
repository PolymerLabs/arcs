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
const Slot = require('./dom-slot.js');

let log = !global.document || (global.logging === false) ? () => {} : console.log.bind(console, '---------- SlotComposer::');

class SlotManager {
  constructor(domRoot, pec) {
    this._slotBySlotId = new Map();
    // Contains both fulfilled slots and pending requests.
    this._slotIdByParticleSpec = new Map();
    this._pec = pec;
    this._getOrCreateSlot('root').initialize(domRoot, /* exposedView= */ undefined);
  }
  _getOrCreateSlot(slotid) {
    if (!this._slotBySlotId.has(slotid)) {
      this._slotBySlotId.set(slotid, this._createSlot(slotid));
    }
    return this._slotBySlotId.get(slotid);
  }
  _createSlot(slotid) {
    return new Slot(slotid);
  }
  hasSlot(slotid) {
    return this._slotBySlotId.has(slotid);
  }
  registerSlot(particleSpec, slotid) {
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
    }).then(slot => {
      this._assignSlot(slotid, slot, particleSpec);
    });
  }
  _assignSlot(slotid, slot, particleSpec) {
    log(`_assignSlot("${slotid}")`);
    slot.associateWithParticle(particleSpec);
    this._slotIdByParticleSpec.set(particleSpec, slotid);
  }
  _getSlotId(particleSpec) {
    return this._slotIdByParticleSpec.get(particleSpec);
  }
  _getParticle(slotid) {
    if (this._slotBySlotId.has(slotid)) {
      return this._slotBySlotId.get(slotid)._particleSpec;
    }
  }
  _getSlot(slotid) {
    assert(this._slotBySlotId.has(slotid));
    return this._slotBySlotId.get(slotid);
  }
  _getParticleSlot(particleSpec) {
    return this._getSlot(this._getSlotId(particleSpec));
  }
  // TODO(sjmiles): should be `renderParticle`?
  renderSlot(particleSpec, content, handler) {
    let slot = this._getParticleSlot(particleSpec);
    // returns slot(id)s rendered by the particle
    let innerSlotInfos = slot.render(content, handler);
    if (innerSlotInfos) {
      // the `innerSlotInfos` identify available slot-contexts, make them available for composition
      this._provideInnerSlots(innerSlotInfos, particleSpec);
    }
  }
  _provideInnerSlots(innerSlotInfos, particleSpec) {
    //log(`SlotManager::_provideInnerSlots: [${innerSlotInfos.map(info=>info.id).join(',')}]`);
    innerSlotInfos.forEach(info => {
      let inner = this._getOrCreateSlot(info.id);
      if (inner.isInitialized()) {
        //log(`SlotManager::_provideInnerSlots: slot [${info.id}] is already provisioned`)
      } else {
        //log(`SlotManager::_provideInnerSlots: provisioning slot [${info.id}]`);
        inner.initialize(info.context, particleSpec.exposeMap.get(info.id));
      }
      if (!inner.isAssociated()) {
        //log(`SlotManager::_provideInnerSlots: providing slot [${info.id}]`);
        inner.providePendingSlot();
      }
    });
  }
  // particleSpec is relinquishing ownership of it's slot
  releaseSlot(particleSpec) {
    let slotid = this._getSlotId(particleSpec);
    if (slotid) {
      let slot = this._getSlot(slotid);
      // particleSpec is mapped to slotid, hence it is either associated or pending.
      if (slot.particleSpec == particleSpec) {
        //this._disassociateSlotFromParticle(slot);
        return this._releaseSlot(slotid);
      } else slot.removePendingRequest(particleSpec);
    }
  }
  _releaseSlot(slotid) {
    let slot = this._getSlot(slotid);
    this._disassociateSlotFromParticle(slot);
    // teardown rendering, retrieve info on lost slots
    let lostInfos = slot.derender();
    // acquire list of particles who lost slots
    let affectedParticles = lostInfos.map(s => this._getParticle(s.id));
    // remove lost slots
    lostInfos.forEach(s => this._removeSlot(this._getSlot(s.id)));
    log(`_releaseSlotId("${slotid}"):`, affectedParticles);
    // released slot is now available for another requester
    slot.providePendingSlot();
    // return list of particles who lost slots
    return affectedParticles;
  }
  // Force free slot contents and particles associated to free up the slot for user accepted suggestion.
  freeSlot(slotid) {  // TODO: add tests for freeSlot
    let slot = this._getSlot(slotid);
    if (slot.isAssociated()) {
      this._disassociateSlotFromParticle(slot);
      slot._pendingRequests.clear();
      this._releaseSlot(slotid);
    }
  }
  _disassociateSlotFromParticle(slot) {
    this._slotIdByParticleSpec.delete(slot.particleSpec);
    slot.disassociateParticle();
  }
  // `remove` means to evacipate the slot context (`release` otoh means only to mark the slot as unused)
  _removeSlot(slot) {
    if (slot.isAssociated()) {
      this._disassociateSlotFromParticle(slot);
    }
    slot.uninitialize();
    this._slotBySlotId.delete(slot.slotid);
  }
}

module.exports = SlotManager;
