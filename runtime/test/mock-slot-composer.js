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

import {assert} from './chai-web.js';
import Slot from '../slot.js';
import SlotComposer from '../slot-composer.js';

let logging = false;
let log = (!logging || global.logging === false) ? () => {} : console.log.bind(console, '---------- MockSlotComposer::');

class MockSlot extends Slot {
  constructor(consumeConn, arc) {
    super(consumeConn, arc);
    this._content = {};
  }
  setContent(content, handler) {
    this._content = Object.assign(this._content, content);
  }
  getInnerContext(slotName) {
    if (this._content.template && this._content.template.indexOf('slotid="annotation"') > 0) {
      return 'dummy-context';
    }
  }
   constructRenderRequest() {
     if (this._content.template) {
       return ['model'];
     }
     return ['template', 'model'];
   }
}

class MockSlotComposer extends SlotComposer {
  constructor() {
    super({ rootContext: "dummy-context", affordance: "mock"});
    this.expectQueue = [];
    this.onExpectationsComplete = () => undefined;
  }

  getSlotClass(affordance) {
    switch(this.affordance) {
      case "mock":
        return MockSlot;
      default:
        assert("unsupported affordance ", this.affordance);
    }
  }

  initializeRecipe(recipe) {
    super.initializeRecipe(recipe);
  }

  newExpectations() {
    this.expectQueue.push([]);
    return this;
  }

  expectRenderSlot(particleName, slotName, contentTypes) {
    assert(this.expectQueue.length > 0, 'No expectations');

    for (let contentType of contentTypes) {
      this.expectQueue[this.expectQueue.length - 1].push({type: 'render', particleName, slotName, contentType});
    }
    return this;
  }

  thenSend(particleName, slotName, event, data) {
    assert(this.expectQueue.length > 0, 'No expectations');

    this.expectQueue[this.expectQueue.length - 1].then = {particleName, slotName, event, data};
    return this;
  }

  expectationsCompleted() {
    if (this.expectQueue.length == 0)
      return Promise.resolve();
    return new Promise((resolve, reject) => this.onExpectationsComplete = resolve);
  }

  _sendEvent({particleName, slotName, event, data}) {
    let particle = this._slots.find(s => s.consumeConn.particle.name == particleName).consumeConn.particle;
    this.pec.sendEvent(particle, slotName, {handler: event, data});
  }

  renderSlot(particle, slotName, content) {
//    console.log(`renderSlot ${particle.name}:${slotName}`, Object.keys(content).join(', '));
    assert(this.expectQueue.length > 0 && this.expectQueue[0],
      `Got a renderSlot from ${particle.name}:${slotName} (content types: ${Object.keys(content).join(', ')}), but not expecting anything further.`);
    var expectations = this.expectQueue[0];
    for (let contentType of Object.keys(content)) {
      let found = false;
      for (let i = 0; i < expectations.length; ++i) {
        let expectation = expectations[i];
        if (expectation.type == 'render' && expectation.particleName == particle.name &&
            expectation.slotName == slotName && expectation.contentType == contentType) {
          expectations.splice(i, 1);
          found = true;
          break;
        }
      }
      assert(found, `Unexpected render slot ${slotName} for particle ${particle.name} (content type: ${contentType})`);
    }
    if (expectations.length == 0) {
      this.expectQueue.shift();
      this.expectationMet(expectations);
    }

    super.renderSlot(particle, slotName, content);
    let slot = this.getSlot(particle, slotName);
    if (slot) {
      super.updateInnerSlots(slot);
    } else {
      // Slots of particles hosted in transformation particles.
    }
  }

  expectationMet(expectation) {
    if (expectation.then) {
      log(`expectationMet: sending event`, expectation.then);
      this._sendEvent(expectation.then);
    }
    if (this.expectQueue.length == 0) {
      this.onExpectationsComplete();
    }
  }
}

export default MockSlotComposer;
