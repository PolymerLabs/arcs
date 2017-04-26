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

// TODO(sjmiles): SlotManager 
// - needs a new name, 
// - needs better function names,
// - needs better data design. 
// Above are blocked on deeper functionality: 
// - slot ownership tracking
// - slot/particle mapping
// - release slot
// - make into class
class SlotManager {
  constructor() {
    this._content = {};
    if (global.document) {
      this._slotDom = {root: {insertion: document.body, view: undefined}};
    } else {
      this._slotDom = {root: {insertion: {}, view: undefined}};
    };
    /*
    this._slotDom = {root: {
      insertion: global.document ? global.document.body : null, 
      view: undefined
    }};
    */
    this._slotOwners = {};
    this._targetSlots = new Map();
    this._pendingSlotRequests = {};
  }
  registerSlot(particleid, slotid, view) {
    return new Promise((resolve, reject) => {
      if (this._slotDom[slotid] && !this._slotOwners[slotid]) {
        resolve();
      } else {
        this._pendingSlotRequests[slotid] = resolve;
      }
    }).then(() => {
      this._targetSlots.set(particleid, { slotid, view });
      this._slotOwners[slotid] = particleid;
    });
  }
  _getSlotId(particleid) {
    let {slotid} = this._targetSlots.get(particleid);
    return slotid;
  }
  _getParticle(slotid) {
    return this._slotOwners[slotid];
  }
  renderSlot(particleid, content) {
    let { slotid, view } = this._targetSlots.get(particleid);
    let slot = this._slotDom[slotid].insertion;
    let slotView = this._slotDom[slotid].view;
    assert(view == slotView);
    // TODO(sjmiles): cache the content in case the containing
    // particle re-renders
    this._content[slotid] = content;
    if (slot !== undefined) {
      slot.innerHTML = content;
      this._findSlots(particleid, slot);
    }
  }
  _findSlots(particleSpec, dom) {
    var slots;
    if (global.document) {
      slots = dom.querySelectorAll("[slotid]");
      slots = Array.prototype.slice.call(slots);
    } else {
      slots = [];
      var slot;
      var RE = /slotid="([^"]*)"/g;
      while (slot = RE.exec(dom.innerHTML)) {
        slots.push(slot[1]);
      }
    }
    slots.forEach(slot => {
      var slotid;
      if (global.document) {
        slotid = slot.getAttribute('slotid');
      } else {
        slotid = slot;
      }
      this._slotDom[slotid] = { insertion: slot, view: particleSpec.exposeMap.get(slotid) };
      if (this._content[slotid]) {
        slot.innerHTML = this._content[slotid];
        this._findSlots(slot);
      } else this._provideSlot(slotid);
    });
  }
  _provideSlot(slotid) {
    let pending = this._pendingSlotRequests[slotid];
    pending && pending();
  }
  releaseSlot(particle) {
    console.log('releaseSlot', particle);
    let slotid = this._getSlotId(particle);
    if (slotid) {
      this._releaseSlotData(particle, slotid);
      let dom = this._slotDom[slotid];
      let slots = Array.prototype.slice.call(dom.querySelectorAll("[slotid]"));
      slots = slots.map(s => s.getAttribute('slotid'));
      let particles = slots.map(s => this._getParticle(s));
      slots.forEach(this._releaseChildSlot, this);
      dom.textContent = '';
      return particles;
    }
  }
  _releaseSlotData(particle, slotid) {
    this._content[slotid] = null;
    this._targetSlots[particle] = null;
    this._slotOwners[slotid] = null;
  }
  _releaseChildSlot(slotid) {
    let particle = this._slotOwners[slotid];
    this._releaseSlotData(particle, slotid);
    this._slotDom[slotid] = null;
  }
}

module.exports = new SlotManager();
