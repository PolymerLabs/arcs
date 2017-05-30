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
    // A map of pending slot requests, mapping {resolve, reject} tuple by requesting particle name.
    this._pendingRequests = new Map();
  }
  get slotid() { 
    return this._slotid; 
  }
  get particleSpec() { 
    return this._particleSpec; 
  }
  assignParticle(particleSpec) {
    assert(!this._particleSpec, "Particle spec already set, cannot assign slot");
    // Verify that particle that hosts this slot exposes the same view that is
    // being rendered by the particle that is being assigned to it.
    assert(!this._exposedView ||
           this._particleSpec.renderMap.get(this._slotid) == this._exposedView,
           "Cannot assign slot to particle-spec with an unmatching view.");
    this._particleSpec = particleSpec;
  }
  unassignParticle() {
    assert(this._particleSpec, "Particle spec is not set, cannot unassign slot");
    this._particleSpec = null;
  }
  hasParticle() {
    return !!this._particleSpec;
  }
  addPendingRequest(particleSpec, resolve, reject) {
    if (!this._pendingRequests.has(particleSpec.particle.name)) {
      this._pendingRequests.set(particleSpec.particle.name, {resolve, reject});
    }
  }
  removePendingRequest(particleSpec) {
    let particleName = particleSpec.particle.name;
    assert(this._pendingRequests.has(particleName),
      `Cannot remove pending request from particle ${particleSpec.particle.name} for slot ${this.slotid}`);
    this._pendingRequests.get(particleName).reject();
    this._pendingRequests.delete(particleName);
  }
  providePendingSlot() {
    assert(!this.hasParticle(), "Cannot provide assigned slot.");
    if (this._pendingRequests.size > 0) {
      let pendingRequest = this._pendingRequests.entries().next();
      if (pendingRequest && pendingRequest.value[1].resolve) {
        pendingRequest.value[1].resolve(this);
        this._pendingRequests.delete(pendingRequest.value[0]);
      }
    }
  }
  /*
    abstract methods
  */
  initialize(context, exposedView) {
  }
  isInitialized() {
  }
  isAvailable() {
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