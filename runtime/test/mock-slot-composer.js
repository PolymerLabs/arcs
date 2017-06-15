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

let logging = false;
let log = (!logging || global.logging === false) ? () => {} : console.log.bind(console, '---------- MockSlotComposer::');

class MockSlotComposer {
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

  expectReleaseSlot(name, slotId) {
    this.expectQueue.push({type: 'releaseSlot', name});
    return this;
 }

  expectRender(name) {
    this.expectQueue.push({type: 'render', name});
    return this;
  }

  expectTemplate(name) {
    this.expectQueue.push({type: 'template', name});
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
    assert(spec, "slot supplied to _sendEvent is not registered");
    this.pec.sendEvent(spec, {handler: event, data});
  }

  renderSlot(particleSpec, content) {
    var isTemplate = content && content.template;
    log(`renderSlot: ${particleSpec.particle.name}`, isTemplate ? 'TEMPLATE' : 'MODEL');
    var expectation = this.expectQueue.shift();
    assert(expectation, "Got a render but not expecting anything further.");
    if (isTemplate)
      assert.equal('template', expectation.type, `expecting a template, not ${expectation.type}`);
    else 
      assert.equal('render', expectation.type, `expecting a render, not ${expectation.type}`);
    assert.equal(particleSpec.particle.spec.name, expectation.name,
        `expecting a render from ${expectation.name}, not ${particleSpec.particle.spec.name}`);
    this.expectationMet(expectation);
  }

  registerSlot(particleSpec, slotId) {
    log(`registerSlot: ${particleSpec.particle.name}:${slotId}`);
    var expectation = this.expectQueue.shift();
    assert(expectation, `Got a getSlot '${slotId}' from '${particleSpec.particle.spec.name}' but not expecting anything further`);
    assert.equal('getSlot', expectation.type, `expecting a ${expectation.type}, not a getSlot`);
    assert.equal(particleSpec.particle.spec.name, expectation.name,
        `expecting a getSlot from ${expectation.name}, not ${particleSpec.particle.spec.name}`);
    assert.equal(slotId, expectation.slotId,
        `expecting slotId ${expectation.slotId}, not ${slotId}`);
    this.specs.set(slotId, particleSpec);
    return Promise.resolve().then(() => {
      this.expectationMet(expectation);
    });
  }

  releaseSlot(particleSpec) {
    // TODO(sjmiles): do something?
    log(`releaseSlot:`, particleSpec.particle.name);
    var expectation = this.expectQueue.shift();
    assert(expectation, `Got a releaseSlot from '${particleSpec.particle.spec.name}' but not expecting anything further`);
    assert.equal('releaseSlot', expectation.type, `expecting a ${expectation.type}, not a releaseSlot`);
    assert.equal(particleSpec.particle.spec.name, expectation.name,
        `expecting a releaseSlot from ${expectation.name}, not ${particleSpec.particle.spec.name}`);
    this.expectationMet(expectation);
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

module.exports = MockSlotComposer;