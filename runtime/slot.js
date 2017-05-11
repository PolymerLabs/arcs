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
    this._dom = null;
    // The View exposed by Particle that hosts this slot.
    this._exposedView = null;
    this._particleSpec = null;
    this._pendingRequestsHandlers = [];
  }
  get slotid() { 
    return this._slotid; 
  }
  get particleSpec() { 
    return this._particleSpec; 
  }
  associateWithParticle(particleSpec) {
    assert(!this._particleSpec, "Particle spec already set, cannot associate slot");
    // Verify that particle that hosts this slot exposes the same view that is
    // being rendered by the particle that is being associated with it.
    assert(!this._exposedView ||
           this._particleSpec.renderMap.get(this._slotid) == this._exposedView,
           "Cannot associate particle-spec with an unmatching view.");
    this._particleSpec = particleSpec;
  }
  disassociateParticle() {
    assert(this._particleSpec, "Particle spec is not set, cannot disassociate slot");
    this._particleSpec = null;
  }
  isAssociated() {
    return !!this._particleSpec;
  }
  addPendingRequest(handler) {
    this._pendingRequestsHandlers.push(handler);
  }
  providePendingSlot() {
    assert(!this.isAssociated(), "Cannot provide associated slot.");
    let handler = this._pendingRequestsHandlers.shift();
    if (handler) {
      handler(this);
    }
  }
  /*
    abstract methods
  */
  initialize(context, exposedView) {
  }
  isInitialized() {
  }
  uninitialize() {
  }
  get content() {
  }
  render(content, eventHandler) {
  }
  derender() {
  }
}

module.exports = Slot;