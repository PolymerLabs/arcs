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

/** @class MockSlotComposer
 * Helper class to test with slot composer.
 * Usage example:
 *   mockSlotComposer
 *       .newExpectations()
 *           .expectRenderSlot('MyParticle1', 'mySlot1', ['template', 'model'])
 *           .thenSend('MyParticle1', 'mySlot1', '_onMyEvent', {key: 'value'})
 *       .newExpectations()
 *           .expectRenderSlot('MyParticle1', 'mySlot1', ['model'])
 *           .expectRenderSlot('MyParticle2', 'mySlot2', ['template', 'model'], (content) => !!content.myParam)
 *           .maybeRenderSlot('MyOptionalParticle', 'myOptionalSlot', ['template', 'model'])
 *   await mockSlotComposer.expectationsCompleted();
 */
class MockSlotComposer extends SlotComposer {
  constructor() {
    super({rootContext: 'dummy-context', affordance: 'mock'});
    this.expectQueue = [];
    this.onExpectationsComplete = () => undefined;
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
   * Creates a new group of expectations (that may occur in arbitrary order.
   */
  newExpectations() {
    this.expectQueue.push([]);
    return this;
  }

  /** @method expectContentItemsNumber(num, content)
   * Returns true, if the number of items in content's model is equal to the given number.
   */
  expectContentItemsNumber(num, content) {
    assert(content.model.items, `Content model doesn\'t have items (${num} expected}`);
    assert(content.model.items.length <= num, `Too many items (${content.model.items.length}), while only ${num} were expected.`);
    return content.model.items.length == num;
  }

  /** @method maybeRenderSlot(num, content)
   * Adds an optional rendering expectation - a group of expectations is considered satifsied if only optional expectation remain.
   * The optional expectation can only be executed within its own expectations group.
   */
  maybeRenderSlot(particleName, slotName, contentTypes) {
    assert(this.expectQueue.length > 0, 'No expectations');

    for (let contentType of contentTypes) {
      this.expectQueue[this.expectQueue.length - 1].push({type: 'render', particleName, slotName, contentType, isOptional: true});
    }
    return this;
  }

  /** @method expectRenderSlot(particleName, slotName, contentTypes, verifyComplete)
   * Adds a rendering expectation.
   * particleName, slot name: the expected rendering particle and slot name
   * contentTypes: the expected set of keys in the content object of the render request
   * verifyComplete: an additional optional handler that determines whether the incoming render request satisfies the expectation.
   */
  expectRenderSlot(particleName, slotName, contentTypes, verifyComplete) {
    assert(this.expectQueue.length > 0, 'No expectations');

    for (let contentType of contentTypes) {
      this.expectQueue[this.expectQueue.length - 1].push({type: 'render', particleName, slotName, contentType, verifyComplete});
    }
    return this;
  }

  /** @method thenSend(particleName, slotName, event, data)
   * Adds an event that will be sent once the current group of expectations is met.
   */
  thenSend(particleName, slotName, event, data) {
    assert(this.expectQueue.length > 0, 'No expectations');

    let expectations = this.expectQueue[this.expectQueue.length - 1];
    expectations.then = {particleName, slotName, event, data};
    if (expectations.length == 0) {
      this.expectQueue.shift();
      this._expectationMet(expectations);
    }
    return this;
  }

  areAllExpectationsMet() {
    return this.expectQueue.length == 0;
  }

  areAllRequiredExpectationsMet() {
    return this.areAllExpectationsMet() ||
           (this.expectQueue.length == 1 && this._isAllOptional(this.expectQueue[0]));
  }

  _isAllOptional(expectations) {
    return expectations.every(e => e.isOptional);
  }

  expectationsCompleted() {
    if (this.areAllRequiredExpectationsMet()) {
      return Promise.resolve();
    }
    return new Promise((resolve, reject) => this.onExpectationsComplete = resolve);
  }

  allExpectationsCompleted() {
    console.log('Are all expectations complete?');
    if (this.areAllExpectationsMet()) {
      console.log('Yes, all are complete, resolving');
      return Promise.resolve();
    }
    console.log('Returning promise to completion');
    return new Promise((resolve, reject) => {
      console.log('waiting for expectations to complete');
      this.expectationsCompleted().then(() => {
        this.detailedLogDebug();
        console.log('All required expectations complete, skipping optional');
        this._skipOptional();//.then(() => resolve());
        this.detailedLogDebug();
        resolve();
        console.log('resolved');
      });
    });
  }

  _sendEvent({particleName, slotName, event, data}) {
    let particle = this._slots.find(s => s.consumeConn.particle.name == particleName).consumeConn.particle;
    this.pec.sendEvent(particle, slotName, {handler: event, data});
  }

  _verifyRenderContent(expectations, particle, slotName, content) {
    for (let contentType of Object.keys(content)) {
      let i = expectations.findIndex(e => {
        return e.type == 'render' && e.particleName == particle.name && e.slotName == slotName && e.contentType == contentType;
      });
      if (i >= 0) {
        let expectation = expectations[i];
        if (!expectation.verifyComplete || expectation.verifyComplete(content)) {
          this._expectationMet(expectation);
          expectations.splice(i, 1);
        }
      } else {
        return false;
      }
    }
    return true;
  }

  async renderSlot(particle, slotName, content) {
    console.log(`renderSlot ${particle.name}:${slotName}`, Object.keys(content).join(', '));
    assert(this.expectQueue.length > 0 && this.expectQueue[0],
      `Got a renderSlot from ${particle.name}:${slotName} (content types: ${Object.keys(content).join(', ')}), but not expecting anything further.`);

    let expectations = this.expectQueue[0];
    let found = this._verifyRenderContent(expectations, particle, slotName, content);
    if (!found) {
      if (this._isAllOptional(expectations)) {
        this.expectQueue.shift();
        expectations = this.expectQueue[0];
        found = this._verifyRenderContent(expectations, particle, slotName, content);
      }
    }
    assert(found, `Unexpected render slot ${slotName} for particle ${particle.name} (content types: ${Object.keys(content).join(',')})`);

    if (expectations.length == 0) {
      this.expectQueue.shift();
      this._expectationsMet();
    }

    super.renderSlot(particle, slotName, content);
    let slot = this.getSlot(particle, slotName);
    if (slot) {
      await super.updateInnerSlots(slot);
    } else {
      // Slots of particles hosted in transformation particles.
    }
    this.detailedLogDebug();
  }

  // Helper method to resolve the current expectation group, if all remaining expectations are optional.
  _skipOptional() {
    // return new Promise((resolve) => {
    if (this.areAllRequiredExpectationsMet()) {
      this.expectQueue.shift();
      this._expectationsMet();
    }
    // };
  }
    // return new Promise((resolve) => {
    //   if (this.areAllExpectationsMet()) {
    //     resolve();
    //   } else {
    //     // TODO: get rid of set timeout. Instead update MockSlotComposer to return two promises:
    //     // one for required expectations, another for all promises.
    //     setTimeout(() => {
    //       if (this._isAllOptional(this.expectQueue[0] || [])) {
    //         this.expectQueue.shift();
    //         this._expectationsMet();
    //       }
    //       resolve();
    //     }, 500);
    //   }
    // });
  //}

  _expectationMet(expectation) {
    if (expectation.then) {
      log(`_expectationMet: sending event`, expectation.then);
      this._sendEvent(expectation.then);
    }
  }

  _expectationsMet() {
    if (this.areAllRequiredExpectationsMet()) { //if (this.areAllExpectationsMet()) {
      this.onExpectationsComplete();
    }
  }

  detailedLogDebug() {
    console.log(`    Has ${this.expectQueue.length} expectation groups:  [ ${this.expectQueue.map(expectations => {
      let expectationsByParticle = {};
      expectations.forEach(e => {
        if (!expectationsByParticle[e.particleName]) {
          expectationsByParticle[e.particleName] = {};
        }
        let key = `${e.isOptional ? 'opt_' : ''}${e.contentType}`;
        if (!expectationsByParticle[e.particleName][key]) {
          expectationsByParticle[e.particleName][key] = 0;
        }
        expectationsByParticle[e.particleName][key]++;
      });
      return `${expectations.length} expectations : {${Object.keys(expectationsByParticle).map(p => {
        return `${p}: (${Object.keys(expectationsByParticle[p]).map(key => `${key}=${expectationsByParticle[p][key]}`).join('; ')})`;
      }).join(', ')}}`;
    }).join('\n\t\t\t\t')}]`);
  }
}

export default MockSlotComposer;
