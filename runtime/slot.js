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

import assert from '../platform/assert-web.js';

class Slot {
  constructor(consumeConn, arc) {
    assert(consumeConn);
    assert(arc);
    this._consumeConn = consumeConn;
    this._arc = arc;
    this._context = null;
    this.startRenderCallback = null;
    this.stopRenderCallback = null;
    this._hostedSlotById = new Map();
  }
  get consumeConn() { return this._consumeConn; }
  get arc() { return this._arc; }
  getContext() { return this._context; }
  async setContext(context) { this._context = context; }
  isSameContext(context) { return this._context == context; }

  async updateContext(context) {
    // do nothing, if context unchanged.
    if ((!this.getContext() && !context) ||
        (this.getContext() && context && this.isSameContext(context))) {
      return;
    }

    // update the context;
    let wasNull = !this.getContext();
    await this.setContext(context);
    if (this.getContext()) {
      if (wasNull) {
        this.startRender();
      }
    } else {
      this.stopRender();
    }
  }
  startRender() {
    if (this.startRenderCallback) {
      let contentTypes = this.constructRenderRequest();
      this.startRenderCallback({ particle: this.consumeConn.particle, slotName: this.consumeConn.name, contentTypes });

      for (let hostedSlot of this._hostedSlotById.values()) {
        this.startRenderCallback({ particle: hostedSlot.particle, slotName: hostedSlot.slotName, contentTypes });
      }
    }
  }

  stopRender() {
    if (this.stopRenderCallback) {
      this.stopRenderCallback({ particle: this.consumeConn.particle, slotName: this.consumeConn.name });

      for (let hostedSlot of this._hostedSlotById.values()) {
        this.stopRenderCallback({ particle: hostedSlot.particle, slotName: hostedSlot.slotName });
      }
    }
  }

  async populateViewDescriptions() {
    let descriptions = {};
    await Promise.all(Object.values(this.consumeConn.particle.connections).map(async viewConn => {
      if (viewConn.view) {
        descriptions[`${viewConn.name}.description`] = (await this._arc.description.getViewDescription(viewConn.view)).toString();
      }
    }));
    return descriptions;
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
           `Unexpected particle name ${hostedParticle.name} for slot ${hostedSlotId}; expected: ${hostedSlot.particleName}`)
    hostedSlot.particle = hostedParticle;
    if (this.getContext() && this.startRenderCallback) {
      this.startRenderCallback({ particle: hostedSlot.particle, slotName: hostedSlot.slotName, contentTypes: this.constructRenderRequest() });
    }
  }

  // absract
  async setContent(content, handler) {}
  getInnerContext(slotName) {}
  constructRenderRequest() {}
  static findRootSlots(context) { }
}

export default Slot;
