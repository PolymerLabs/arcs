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
// - needs a new name
// - needs better function names
// - needs better data design

class SlotManager {
  constructor(domRoot, pec) {
    this._content = {};
    this._slotDom = {root: {insertion: domRoot, view: undefined}};
    this._slotOwners = {};
    this._targetSlots = new Map();
    this._pendingSlotRequests = {};
    this._pec = pec;
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
    return this._targetSlots.get(particleid).slotid;
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
      this._findEventGenerators(particleid, slot);
    }
  }
  _findSlots(particleSpec, dom) {
    var slots;
    if (global.document) {
      slots = Array.from(dom.querySelectorAll("[slotid]"));
    } else {
      slots = [];
      var slot;
      var RE = /slotid="([^"]*)"/g;
      while ((slot = RE.exec(dom.innerHTML))) {
        slots.push({id:slot[1]});
      }
    }
    slots.forEach(slot => {
      let slotid = global.document ? slot.getAttribute('slotid') : slot.id;
      this._slotDom[slotid] = { insertion: slot, view: particleSpec.exposeMap.get(slotid) };
      if (this._content[slotid]) {
        slot.innerHTML = this._content[slotid];
        this._findSlots(particleSpec, slot);
      } else this._provideSlot(slotid);
    });
  }
  _findEventGenerators(particleSpec, dom) {
    var eventGenerators;
    if (global.document) {
      eventGenerators = dom.querySelectorAll("[events]");
    }
    for (var eventGenerator of eventGenerators) {
      var attributes = eventGenerator.attributes;
      for (var {name, value} of attributes) {
        if (name.startsWith("on-")) {
          var event = name.substring(3);
          (function(v) {eventGenerator.addEventListener(event, e => this._pec.sendEvent(particleSpec, v));}).call(this, value);
        }
      }
    }
  }
  _provideSlot(slotid) {
    let pending = this._pendingSlotRequests[slotid];
    pending && pending();
  }
  releaseSlot(particle) {
    // TODO(sjmiles): need to handle the case where particle's slot is pending
    let slotid = this._getSlotId(particle);
    if (slotid) {
      this._releaseSlotData(particle, slotid);
      let dom = this._slotDom[slotid];
      // TODO(sjmiles): missing mock-DOM version
      if (global.document) {
        let slots = Array.from(dom.insertion.querySelectorAll("[slotid]"));
        slots = slots.map(s => s.getAttribute('slotid'));
        let particles = slots.map(s => this._getParticle(s));
        slots.forEach(this._releaseChildSlot, this);
        dom.insertion.innerHTML = '';
        return particles;
      }
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

module.exports = SlotManager;