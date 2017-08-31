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
const Slot = require('./slot.js');
const DomSlot = require('./dom-slot.js');

function createNewSlot(affordance, consumeConn, arc) {
  switch(affordance) {
    case "dom":
    case "dom-touch":
    case "vr":
      return new DomSlot(consumeConn, arc);
    case "mock":
      return new Slot(consumeConn, arc);
    default:
      assert("unsupported affordance ", affordance);
  }
}

class SlotComposer {
  constructor(options) {
    assert(options.affordance, "Affordance is mandatory");
    assert(options.rootContext, "Root context is mandatory");

    this.affordance = options.affordance;
    this.rootContext = options.rootContext;
    this._slots = [];
    this._nextSlotId = 0;
  }
  getSlot(particle, slotName) {
    return this._slots.find(s => s.consumeConn.particle == particle && s.consumeConn.name == slotName);
  }
  initializeRecipe(recipeParticles) {
    let newSlots = [];
    // Create slots for each of the recipe's particles slot connections.
    recipeParticles.forEach(p => {
      Object.values(p.consumedSlotConnections).forEach(cs => {
        let slot = createNewSlot(this.affordance, cs, this.arc);
        slot.startRenderCallback = this.arc.pec.startRender.bind(this.arc.pec);
        slot.stopRenderCallback = this.arc.pec.stopRender.bind(this.arc.pec);
        slot.innerSlotsUpdateCallback = this.updateInnerSlots.bind(this);
        newSlots.push(slot);
      });
    });

    // Attempt to set context for each of the slots.
    newSlots.forEach(s => {
      assert(!s.context, `Unexpected context in new slot`);

      let context = null;
      let sourceConnection = s.consumeConn.targetSlot && s.consumeConn.targetSlot.sourceConnection;
      if (sourceConnection) {
        let sourceConnSlot = this.getSlot(sourceConnection.particle, sourceConnection.name);
        if (sourceConnSlot) {
          context = sourceConnSlot.getInnerContext(s.consumeConn.name);
        }
      } else {
        // TODO: currently any slot that doesn't have a sourceConnection falls back to using the root context.
        // Instead it should be explicitely determined by the slot matching strategy.
        context = this.rootContext;
      }
      if (context) {
        s.setContext(context);
      }

      this._slots.push(s);
    });
  }

  renderSlot(particle, slotName, content) {
    let slot = this.getSlot(particle, slotName);
    assert(slot, `Cannot find slot ${slotName} for particle ${particle.name}`);

    // Set the slot's new content.
    slot.setContent(content, eventlet => this.arc.pec.sendEvent(particle, slotName, eventlet));
  }

  updateInnerSlots(slot) {
    assert(slot, 'Cannot update inner slots of null');
    // Update provided slot contexts.
    Object.keys(slot.consumeConn.providedSlots).forEach(providedSlotName => {
      let providedContext = slot.getInnerContext(providedSlotName);
      let providedSlot = slot.consumeConn.providedSlots[providedSlotName];
      providedSlot.consumeConnections.forEach(cc => {
        // This will trigger "start" or "stop" render, if applicable.
        this.getSlot(cc.particle, cc.name).setContext(providedContext);
      });
    });
  }

  getAvailableSlots() {
    let targetSlots = new Set();
    let availableSlots = {};
    this._slots.forEach(slot => {
      assert(slot.consumeConn.targetSlot);
      Object.values(slot.consumeConn.providedSlots).forEach(ps => {
        if (!availableSlots[ps.name]) {
          availableSlots[ps.name] = {};
        }
        let psId = ps.id || `slotid-${this._nextSlotId++}`;
        ps.id = psId;
        // TODO(mmandlis): availableSlots[ps.name] should be an array of slots,
        // in case slot with the same name if provided by more than one particle.
        availableSlots[ps.name] = {
          id: psId,
          count: ps.consumeConnections.length,
          views: ps.viewConnections.map(vc => vc.view)
        };
      });
    });

    // Populate default "root" slot, if not available yet.
    assert(!availableSlots["root"], `Root slot cannot be provided`);
    availableSlots["root"] = {id:"r0", count:0, views: []};

    return availableSlots;
  }
}

module.exports = SlotComposer;
