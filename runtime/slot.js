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

import {assert} from '../platform/assert-web.js';

export class Slot {
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
      const slotName = this.consumeConn.name;
      const particle = this.consumeConn.particle;
      const context = this.getContext();
      if (context.updateParticleName) {
        context.updateParticleName(slotName, particle.name);
      }
      this.startRenderCallback({particle, slotName, contentTypes: this.constructRenderRequest()});

      for (let hostedSlot of this._hostedSlotById.values()) {
        if (hostedSlot.particle) {
          // Note: hosted particle may still not be set, if the hosted slot was already created, but the inner recipe wasn't instantiate yet.
          this.startRenderCallback({
              particle: hostedSlot.particle,
              slotName: hostedSlot.slotName,
              // TODO(mmandlis): Only one of each type of hosted particles need to send the particle template.
              // The problem is with rendering content arriving out of order - currently can't track all slots using the same
              // template and render them after the template is uploaded.
              contentTypes: this.constructRenderRequest(hostedSlot)
          });
        }
      }
    }
  }

  stopRender() {
    if (this.stopRenderCallback) {
      this.stopRenderCallback({particle: this.consumeConn.particle, slotName: this.consumeConn.name});

      for (let hostedSlot of this._hostedSlotById.values()) {
        this.stopRenderCallback({particle: hostedSlot.particle, slotName: hostedSlot.slotName});
      }
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
    if (this.getContext() && this.startRenderCallback) {
      this.startRenderCallback({
          particle: hostedSlot.particle,
          slotName: hostedSlot.slotName,
          // TODO(mmandlis): Only one of each type of hosted particles need to send the particle template.
          // The problem is with rendering content arriving out of order - currently can't track all slots using the same
          // template and render them after the template is uploaded.
          contentTypes: this.constructRenderRequest(hostedSlot)
      });
    }
  }
  formatHostedContent(hostedSlot, content) { return content; }

  // Abstract methods.
  async setContent(content, handler) {}
  getInnerContext(slotName) {}
  constructRenderRequest(hostedSlot) {}
  dispose() {}
  static findRootSlots(context) {}
}
