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

class SlotComposer {
  constructor(options) {
    assert(options.affordance, "Affordance is mandatory");
    assert(options.rootContext, "Root context is mandatory");

    this._containerKind = options.containerKind;
    this._affordance = options.affordance;
    this._slotClass = this.getSlotClass();
    assert(this._slotClass);

    this._contextById = this._slotClass.findRootSlots(options.rootContext) || {};
    if (Object.keys(this._contextById).length == 0) {
      // fallback to single "root" slot using the rootContext.
      this._contextById["root"] = options.rootContext;
    }

    this._slots = [];
    this._nextSlotId = 0;
  }
  get affordance() { return this._affordance; }
  getSlotClass() {
    switch(this._affordance) {
      case "dom":
      case "dom-touch":
      case "vr":
        return DomSlot;
      case "mock":
        return Slot;
      default:
        assert("unsupported affordance ", this._affordance);
    }
  }

  getSlot(particle, slotName) {
    return this._slots.find(s => s.consumeConn.particle == particle && s.consumeConn.name == slotName);
  }

  initializeRecipe(recipeParticles) {
    let newSlots = [];
    // Create slots for each of the recipe's particles slot connections.
    recipeParticles.forEach(p => {
      Object.values(p.consumedSlotConnections).forEach(cs => {
        let slot = new this._slotClass(cs, this.arc, this._containerKind);
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
        context = this._contextById[s.consumeConn.name];
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
    let availableSlots = {};
    this._slots.forEach(slot => {
      assert(slot.consumeConn.targetSlot);
      Object.values(slot.consumeConn.providedSlots).forEach(ps => {
        if (!availableSlots[ps.name]) {
          availableSlots[ps.name] = [];
        }
        let psId = ps.id || `slotid-${this._nextSlotId++}`;
        ps.id = psId;
        let providedSlotSpec = slot.consumeConn.slotSpec.providedSlots.find(psSpec => psSpec.name == ps.name);
        availableSlots[ps.name].push({
          id: psId,
          count: ps.consumeConnections.length,
          providedSlotSpec,
          views: ps.viewConnections.map(vc => vc.view)
        });
      });
    });

    Object.keys(this._contextById).forEach(slotid => {
      if (!availableSlots[slotid]) {
        availableSlots[slotid] = [];
      }
      availableSlots[slotid].push({id:`rootslotid-${slotid}`, count:0, views: [], providedSlotSpec: {isSet: false}});
    });
    return availableSlots;
  }
}

module.exports = SlotComposer;
