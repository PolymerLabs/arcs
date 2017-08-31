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
const Slot = require('../slot.js');
const SlotComposer = require('../slot-composer.js');

let logging = false;
let log = (!logging || global.logging === false) ? () => {} : console.log.bind(console, '---------- MockSlotComposer::');

class MockSlotComposer extends SlotComposer {
  constructor() {
    super({ rootContext: "dummy-context", affordance: "mock"});
    this.expectQueue = [];
    this.onExpectationsComplete = () => undefined;
  }

  initializeRecipe(recipe) {
    Slot.prototype.constructRenderRequest = () => { return ['template', 'model'] };
    super.initializeRecipe(recipe);
  }

  expectRenderSlot(particleName, slotName, contentTypes) {
    this.expectQueue.push({type: 'render', particleName, slotName, contentTypes});
    return this;
  }

  thenSend(particleName, slotName, event, data) {
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
    console.log(`renderSlot ${particle.name}:${slotName}`, Object.keys(content).join(', '));
    var expectation = this.expectQueue.shift();
    assert(expectation, "Got a startRender but not expecting anything further.");
    assert.equal('render', expectation.type, `expecting a startRender, not ${expectation.type}`);
    assert.equal(particle.name, expectation.particleName,
                 `expecting a render from ${expectation.particleName}, not ${particle.name}`);
    assert.equal(slotName, expectation.slotName,
                `expecting a render from ${expectation.slotName}, not ${slotName}`);
    assert.isTrue(expectation.contentTypes.length == Object.keys(content).length &&
                  expectation.contentTypes.every(t => content[t]),
                  `expecting a render of content types [${expectation.contentTypes.join(', ')}], not [${Object.keys(content).join(', ')}]`);
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
