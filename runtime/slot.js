/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
'use strict';

import assert from '../platform/assert-web.js';

export default class Slot {
  constructor(consumeConn, arc) {
    assert(consumeConn);
    assert(arc);
    this._consumeConn = consumeConn;
    this._arc = arc;
    this._context = null;
    this._hostedSlotById = new Map();
    this.hostedSlotUpdateCallback = null;
  }
  get consumeConn() { return this._consumeConn; }
  get arc() { return this._arc; }
  getContext() { return this._context; }
  setContext(context) { this._context = context; }
  isSameContext(context) { return this._context == context; }

  updateContext(context) {
    // do nothing, if context unchanged.
    if ((!this.getContext() && !context) ||
        (this.getContext() && context && this.isSameContext(context))) {
      return;
    }

    // update the context;
    let wasNull = !this.getContext();
    this.setContext(context);
    if (wasNull && this.getContext()) {
      this.onContextInitialized();
    }
  }

  async populateHandleDescriptions() {
    let descriptions = {};
    await Promise.all(Object.values(this.consumeConn.particle.connections).map(async handleConn => {
      if (handleConn.handle) {
        descriptions[`${handleConn.name}.description`] = (await this._arc.description.getHandleDescription(handleConn.handle)).toString();
      }
    }));
    return descriptions;
  }

  onContextInitialized() {
    for (let hostedSlot of this._hostedSlotById.values()) {
      if (hostedSlot.content) {
        this.hostedSlotUpdateCallback && this.hostedSlotUpdateCallback(hostedSlot.slotId, hostedSlot.content);
      }
    }
  }

  addHostedSlot(hostedSlotId, hostedParticleName, hostedSlotName) {
    assert(hostedSlotId, `Hosted slot ID must be provided`);
    assert(!this._hostedSlotById.has(hostedSlotId), `Hosted slot ${hostedSlotId} already exists`);
    this._hostedSlotById.set(hostedSlotId, {slotId: hostedSlotId, particleName: hostedParticleName, slotName: hostedSlotName});
    return hostedSlotId;
  }

  getHostedSlot(hostedSlotId) {
    return this._hostedSlotById.get(hostedSlotId);
  }

  findHostedSlot(hostedParticle, hostedSlotName) {
    for (let hostedSlot of this._hostedSlotById.values()) {
      if (hostedSlot.particle == hostedParticle && hostedSlot.slotName == hostedSlotName) {
        return hostedSlot;
      }
    }
  }

  initHostedSlot(hostedSlotId, hostedParticle) {
    let hostedSlot = this.getHostedSlot(hostedSlotId);
    assert(hostedSlot, `Hosted slot ${hostedSlotId} doesn't exist`);
    assert(hostedSlot.particleName == hostedParticle.name,
           `Unexpected particle name ${hostedParticle.name} for slot ${hostedSlotId}; expected: ${hostedSlot.particleName}`);
    hostedSlot.particle = hostedParticle;
  }

  setHostedSlotContent(hostedSlotId, content) {
    let hostedSlot = this.getHostedSlot(hostedSlotId);
    assert(hostedSlot, `Cannot find hosted slot for ${hostedSlotId}`);
    assert(hostedSlot.particle, `Cannot set content of a hosted slot ${hostedSlotId} with no particle.`);
    hostedSlot.content = content;

    if (this.getContext()) {
      this.hostedSlotUpdateCallback && this.hostedSlotUpdateCallback(hostedSlot.slotId, content);
    }
  }

  // Abstract methods.
  async setContent(content, handler) {}
  getInnerContext(slotName) {}
  static findRootSlots(context) {}
}
