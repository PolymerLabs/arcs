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

let assert = require('chai').assert;

class MockSlotManager {
  constructor(pec) {
    this.pec = pec;
    this.expectQueue = [];
    this.specs = new Map();
    this.onExpectationsComplete = () => undefined;
  }

  expectGetSlot(name, slotId) {
    this.expectQueue.push({type: 'getSlot', name, slotId});
    return this;
  }

  expectRender(name) {
    this.expectQueue.push({type: 'render', name});
    return this;
  }

  thenSend(slot, event, data) {
    this.expectQueue[this.expectQueue.length - 1].then = {slot, event, data};
    return this;
  }

  expectationsCompleted() {
    if (this.expectQueue.length == 0)
      return Promise.resolve();
    return new Promise((resolve, reject) => this.onExpectationsComplete = resolve);
  }

  _sendEvent({slot, event, data}) {
    var spec = this.specs.get(slot);
    console.log(slot);
    this.pec.sendEvent(spec, {handler: event, data});
  }

  renderSlot(particleSpec, content) {
    var expectation = this.expectQueue.shift();
    assert(expectation, "Got a render but not expecting anything further.");
    assert.equal('render', expectation.type, `expecting a render, not ${expectation.type}`);
    assert.equal(particleSpec.particle.spec.name, expectation.name, 
        `expecting a render from ${expectation.name}, not ${particleSpec.particle.spec.name}`);
    if (expectation.then) {
      this._sendEvent(expectation.then);
    }
    if (this.expectQueue.length == 0)
      this.onExpectationsComplete();
  }

  registerSlot(particleSpec, slotId) {
    var expectation = this.expectQueue.shift();
    assert(expectation, `Got a getSlot '${slotId}' from '${particleSpec.particle.spec.name}' but not expecting anything further`);
    assert.equal('getSlot', expectation.type, `expecting a getSlot, not ${expectation.type}`);
    assert.equal(particleSpec.particle.spec.name, expectation.name,
        `expecting a getSlot from ${expectation.name}, not ${particleSpec.particle.spec.name}`);
    assert.equal(slotId, expectation.slotId,
        `expecting slotId ${expectation.slotId}, not ${slotId}`);
    this.specs.set(slotId, particleSpec);
    return Promise.resolve().then(() => {
      if (expectation.then) {
        this._sendEvent(expectation.then);
      }
      if (this.expectQueue.length == 0)
        this.onExpectationsComplete();      
    });
  }
}

module.exports = MockSlotManager;