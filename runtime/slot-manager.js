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

class Slot {
  constructor(slotid) {
    this._slotid = slotid;
    this._dom = undefined;
    this._exposedView = undefined;
    this._particleSpec = undefined;
    this._pendingRequestsHandlers = [];
  }
  get slotid() { return this._slotid; }
  get particleSpec() { return this._particleSpec; }
  associateWithParticle(particleSpec) {
    assert(!this._particleSpec, "Particle spec already set, cannot associate slot");
    assert(!this._exposedView ||
           this._particleSpec.renderMap.get(this._slotid) == this._exposedView,
           "Cannot associate particle-spec with an unmatching view.");

    this._particleSpec = particleSpec;
  }
  disassociateParticle() {
    assert(this._particleSpec, "Particle spec is not set, cannot disassociate slot");
    this._particleSpec = undefined;
  }
  isAssociated() {
    return !!this._particleSpec;
  }
  clearDom() {
    this._dom = null;
  }
  initializeDom(dom, exposedView) {
    this._dom = dom;
    this.exposedView = exposedView;
  }
  isDomInitialized() {
    return !!this._dom;
  }
  get domContent() {
    return this._dom ? this._dom.innerHTML : undefined;
  }
  setDomContent(content) {
    assert(!!this._dom, "Dom isn't initialized, cannot set content");
    this._dom.innerHTML = content;
  }
  findInnerSlots() {
    if (global.document) {
      return Array.from(this._dom.querySelectorAll("[slotid]"));
    } else {
      var slots = [];
      var slot;
      var RE = /slotid="([^"]*)"/g;
      while ((slot = RE.exec(this._dom.innerHTML))) {
        slots.push({id:slot[1]});
      }
      return slots;
    }
  }
  findEventGenerators() {
    if (global.document) {
      return this._dom.querySelectorAll('[events]');
    }
    // TODO(mmandlis): missing mock-DOM version
    return [];
  }

  addPendingRequest(handler) {
    this._pendingRequestsHandlers.push(handler);
  }
  providePendingSlot() {
    assert(!this.isAssociated(), "Cannot provide associated slot.");
    if (this._pendingRequestsHandlers.length > 0) {
      this._pendingRequestsHandlers[0]();
      this._pendingRequestsHandlers.splice(0, 1);
    }
  }
}

class SlotManager {
  constructor(domRoot, pec) {
    this._slotsMap = new Map();
    this._getOrCreateSlot('root').initializeDom(domRoot, /* exposedView= */ undefined);

    this._reverseSlotMap = new Map();  // slotid by particle-spec.
    this._pec = pec;
  }
  registerSlot(particleSpec, slotid) {
    return new Promise((resolve, reject) => {
      let slot = this._getOrCreateSlot(slotid);
      if (slot.isDomInitialized() && !slot.isAssociated()) {
        resolve();
      } else {
        slot.addPendingRequest(resolve);
      }
    }).then(() => {
      let slot = this._slotsMap.get(slotid);
      slot.associateWithParticle(particleSpec);
      this._reverseSlotMap.set(particleSpec, slotid);
    });
  }
  _getSlotId(particleSpec) {
    return this._reverseSlotMap.get(particleSpec);
  }
  _getParticle(slotid) {
    if (this._slotsMap.has(slotid)) {
      return this._slotsMap.get(slotid)._particleSpec;
    }
  }
  _getSlot(slotid) {
    assert(this._slotsMap.has(slotid));
    return this._slotsMap.get(slotid);
  }
  _getOrCreateSlot(slotid) {
    if (!this._slotsMap.has(slotid)) {
      this._slotsMap.set(slotid, new Slot(slotid));
    }
    return this._slotsMap.get(slotid);
  }
  renderSlot(particleSpec, content) {
    let slotid = this._reverseSlotMap.get(particleSpec);
    let slot = this._getSlot(slotid);

    if (slot.isDomInitialized()) {
      slot.setDomContent(content);
      this._provideInnerSlots(particleSpec, slot);
      this._addEventListeners(particleSpec, slot.findEventGenerators());
    }
  }
  _provideInnerSlots(particleSpec, slot) {
    var innerDomSlots = slot.findInnerSlots();
    innerDomSlots.forEach(domSlot => {
      let slotid = global.document ? domSlot.getAttribute('slotid') : domSlot.id;
      let slot = this._getOrCreateSlot(slotid);
      let originalDomContent = slot.domContent;
      slot.initializeDom(domSlot, particleSpec.exposeMap.get(slotid));
      if (originalDomContent) {
        slot.setDomContent(originalDomContent);
        this._provideInnerSlots(particleSpec, slot);
      } else slot.providePendingSlot();
    });
  }
  _addEventListeners(particleSpec, eventGenerators) {
    for (let eventGenerator of eventGenerators) {
      let attributes = eventGenerator.attributes;
      let data = {
        key: eventGenerator.getAttribute('key'),
        value: eventGenerator.value
      };
      for (let {name, value} of attributes) {
        if (name.startsWith("on-")) {
          let event = name.substring(3);
          let handler = value;
          eventGenerator.addEventListener(event, e =>
            this._pec.sendEvent(particleSpec, {handler, data})
          );
        }
      }
    }
  }
  releaseSlot(particleSpec) {
    let slotid = this._getSlotId(particleSpec);
    if (slotid) {
      this._disassociateSlotFromParticle(slotid);
      let slot = this._getSlot(slotid);
      var affectedParticles = [];

      // Release inner slots.
      let slots = slot.findInnerSlots();
      slots = slots.map(s => global.document ? s.getAttribute('slotid') : s.id);
      affectedParticles = slots.map(s => this._getParticle(s));
      slots.forEach(this._releaseChildSlot, this);
      slot.setDomContent('');

      slot.providePendingSlot();
      // Returns affected (i.e. released) inner slots' particles, in order
      // to notify them that they were released.
      return affectedParticles;
    }
  }
  _disassociateSlotFromParticle(slotid) {
    let slot = this._slotsMap.get(slotid);
    this._reverseSlotMap.delete(slot.particleSpec);
    slot.disassociateParticle();
  }
  // Disassociate child slot and clear its DOM.
  _releaseChildSlot(slotid) {
    this._getSlot(slotid).clearDom();
    this._disassociateSlotFromParticle(slotid);
    this._slotsMap.delete(slotid);
  }
}

module.exports = SlotManager;
