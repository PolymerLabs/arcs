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
    if (content.template) {
      this._content.template = content.template;
    }
    this._content.model = content.model;

  }
  getInnerContext(slotName) {
    if (this._content.template && this._content.template.indexOf('slotid="annotation"') > 0) {
      return new MockContext('dummy-context');
    }
  }
   constructRenderRequest() {
     if (this._content.template) {
       return ['model'];
     }
     return ['template', 'model'];
   }
}

class MockContext {
  constructor(context) {
    this.context = context;
  }
  isEqual(other) {
    return this.context == other.context;
  }
}

/** @class MockSlotComposer
 * Helper class to test with slot composer.
 * Usage example:
 *   mockSlotComposer
 *       .newExpectations()
 *           .expectRenderSlot('MyParticle1', 'mySlot1', ['template', 'model']);
 *           .expectRenderSlot('MyParticle1', 'mySlot1', ['model'], 2)
 *           .expectRenderSlotVerify('MyParticle2', 'mySlot2', (content) => !!content.myParam)
 *           .maybeRenderSlot('MyOptionalParticle', 'myOptionalSlot', ['template', 'model'])
 *   mockSlotComposer.sendEvent('MyParticle1', 'mySlot1', '_onMyEvent', {key: 'value'});
 *   await mockSlotComposer.expectationsCompleted();
 */
class MockSlotComposer extends SlotComposer {
  constructor(options) {
    super({rootContext: new MockContext('dummy-context'), affordance: 'mock'});
    this.expectQueue = [];
    this.onExpectationsComplete = () => undefined;
    this.strict = options && options.strict != undefined ? options.strict : true;
  }

  getSlotClass(affordance) {
    switch (this.affordance) {
      case 'mock':
        return MockSlot;
      default:
        assert('unsupported affordance ', this.affordance);
    }
  }

  /** @method newExpectations()
   * Reinitializes expectations queue.
   */
  newExpectations() {
    assert(this.expectQueue.every(e => e.isOptional));
    this.expectQueue = [];

    if (!this.strict) {
      this.ignoreUnexpectedRender();
    }
    return this;
  }

  /** @method ignoreUnexpectedRender
   * Allows ignoring unexpected render slot requests.
   */
  ignoreUnexpectedRender() {
    this.expectQueue.push({type: 'render', ignoreUnexpected: true, isOptional: true});
    return this;
  }

  /** @method expectContentItemsNumber(num, content)
   * Returns true, if the number of items in content's model is equal to the given number.
   */
  expectContentItemsNumber(num, content) {
    assert(content.model, `Content doesn't have model`);
    assert(content.model.items, `Content model doesn\'t have items (${num} expected}`);
    assert(content.model.items.length <= num, `Too many items (${content.model.items.length}), while only ${num} were expected.`);
    return content.model.items.length == num;
  }

  /** @method maybeRenderSlot(num, content)
   * Adds an optional rendering expectation - a group of expectations is considered satifsied if only optional expectation remain.
   * The optional expectation can only be executed within its own expectations group.
   */
  maybeRenderSlot(particleName, slotName, contentTypes, times) {
    times = times || 1;
    for (let i = 0; i < times; ++i) {
      this._addRenderExpectation({particleName, slotName, contentTypes, isOptional: true});
    }
    return this;
  }

  /** @method expectRenderSlot(particleName, slotName, contentTypes)
   * Adds a rendering expectation.
   * particleName, slot name: the expected rendering particle and slot name
   * contentTypes: the expected set of keys in the content object of the render request
   */
  expectRenderSlot(particleName, slotName, contentTypes, times) {
    times = times || 1;
    for (let i = 0; i < times; ++i) {
      this._addRenderExpectation({particleName, slotName, contentTypes});
    }
    return this;
  }

  /** @method expectRenderSlotVerify(particleName, slotName, verifyComplete)
   * Adds a rendering expectation.
   * particleName, slot name: the expected rendering particle and slot name
   * verifyComplete: an additional optional handler that determines whether the incoming render request satisfies the expectation.
   */
  expectRenderSlotVerify(particleName, slotName, verifyComplete) {
    let expectation = {particleName, slotName, verifyComplete};
    return this._addRenderExpectation(expectation);
  }

  /** @method expectationsCompleted()
   * Returns promise to completion of all expectations.
   */
  expectationsCompleted() {
    if (this.expectQueue.length == 0 || this.expectQueue.every(e => e.isOptional)) {
      return Promise.resolve();
    }
    return new Promise((resolve, reject) => this.onExpectationsComplete = resolve);
  }

  /** @method sendEvent(particleName, slotName, event, data)
   * Sends an event to the given particle and slot.
   */
  sendEvent(particleName, slotName, event, data) {
    let particles = this._slots.filter(s => s.consumeConn.particle.name == particleName).map(s => s.consumeConn.particle);
    assert(1 == particles.length, `Multiple particles with name ${particleName} - cannot send event.`);
    this.pec.sendEvent(particles[0], slotName, {handler: event, data});
  }

  _addRenderExpectation(expectation) {
    let current = this.expectQueue.find(e => e.particleName == expectation.particleName && e.slotName == expectation.slotName && e.isOptional == expectation.isOptional);
    if (!current) {
      current = {type: 'render', particleName: expectation.particleName, slotName: expectation.slotName, isOptional: expectation.isOptional};
      this.expectQueue.push(current);
    }
    if (expectation.verifyComplete) {
      assert(!current.verifyComplete);
      current.verifyComplete = expectation.verifyComplete;
    }
    current.contentTypes = (current.contentTypes || []).concat(expectation.contentTypes);
    return this;
  }

  _canIgnore(particleName, slotName, content) {
    // TODO: add support for ignoring specific particles and/or slots.
    return this.expectQueue.find(e => e.type == 'render' && e.ignoreUnexpected);
  }

  _verifyRenderContent(particle, slotName, content) {
    let index = this.expectQueue.findIndex(e => e.type == 'render' && e.particleName == particle.name && e.slotName == slotName);
    if (index < 0) {
      return false;
    }
    let expectation = this.expectQueue[index];

    let found = false;
    let complete = false;
    if (expectation.verifyComplete) {
      found = true;
      complete = expectation.verifyComplete(content);
    } else if (expectation.contentTypes) {
      Object.keys(content).forEach(contentType => {
        let contentIndex = expectation.contentTypes.indexOf(contentType);
        found |= contentIndex >= 0;
        if (contentIndex >= 0) {
          expectation.contentTypes.splice(contentIndex, 1);
        }
      });
      complete = expectation.contentTypes.length == 0;
    } else {
      assert(false, `Invalid expectation: ${JSON.stringify(expectation)}`);
    }

    if (complete) {
      this.expectQueue.splice(index, 1);
    }
    return found;
  }

  async renderSlot(particle, slotName, content) {
    // console.log(`renderSlot ${particle.name}:${slotName}`, Object.keys(content).join(', '));
    assert(this.expectQueue.length > 0,
      `Got a renderSlot from ${particle.name}:${slotName} (content types: ${Object.keys(content).join(', ')}), but not expecting anything further.`);

    let found = this._verifyRenderContent(particle, slotName, content);
    if (!found) {
      let canIgnore = this._canIgnore(particle.name, slotName, content);
      if (canIgnore) {
        console.log(`Skipping unexpected render slot request: ${particle.name}:${slotName} (content types: ${Object.keys(content).join(', ')})`);
      }
      assert(canIgnore, `Unexpected render slot ${slotName} for particle ${particle.name} (content types: ${Object.keys(content).join(',')})`);
    }

    this._expectationsMet();

    super.renderSlot(particle, slotName, content);
    let slot = this.getSlot(particle, slotName);
    if (slot) {
      await super.updateInnerSlots(slot);
    } else {
      // Slots of particles hosted in transformation particles.
    }
    // this.detailedLogDebug();
  }

  _expectationsMet() {
    if (this.expectQueue.length == 0 || this.expectQueue.every(e => e.isOptional)) {
      this.onExpectationsComplete();
    }
  }

  detailedLogDebug() {
    let expectationsByParticle = {};
    this.expectQueue.forEach(e => {
      if (!expectationsByParticle[e.particleName]) {
        expectationsByParticle[e.particleName] = {};
      }
      e.contentTypes && e.contentTypes.forEach(contentType => {
        let key = `${e.isOptional ? 'opt_' : ''}${contentType}`;
        if (!expectationsByParticle[e.particleName][key]) {
          expectationsByParticle[e.particleName][key] = 0;
        }
        expectationsByParticle[e.particleName][key]++;
      });
    });
    console.log(`${this.expectQueue.length} expectations : {${Object.keys(expectationsByParticle).map(p => {
      return `${p}: (${Object.keys(expectationsByParticle[p]).map(key => `${key}=${expectationsByParticle[p][key]}`).join('; ')})`;
    }).join(', ')}}`);
  }
}

export default MockSlotComposer;
