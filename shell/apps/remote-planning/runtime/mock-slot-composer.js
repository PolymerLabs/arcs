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

import {SlotComposer} from '../../../../runtime/ts-build/slot-composer.js';
import {SlotDomConsumer} from '../../../../runtime/ts-build/slot-dom-consumer.js';

const logging = false;
const log = (!logging || global.logging === false) ? () => {} : console.log.bind(console, '---------- MockSlotComposer::');

const assert = (value, msg) => {}; //value || console.log('ASSERT failed: ', msg);
assert.isAbove = () => {};

/** @class MockSlotComposer
 * Helper class to test with slot composer.
 */
export class MockSlotComposer extends SlotComposer {
  /**
   * |options| may contain:
   * - strict: whether unexpected render slot requests cause an assert or a warning log (default: true)
   */
  constructor(options) {
    options = options || {};
    super({rootContainer: options.rootContainer || {'root': 'root-context'}, affordance: 'mock'});
    this.expectQueue = [];
    this.onExpectationsComplete = () => undefined;
    this.strict = options.strict != undefined ? options.strict : true;
    this.logging = options.logging;
    this.debugMessages = [];

    // Clear all cached templates
    SlotDomConsumer.dispose();
  }

   // Overriding this method to investigate AppVeyor failures.
   // TODO: get rid of it once the problem is fixed.
  _addSlotConsumer(slot) {
    super._addSlotConsumer(slot);
    const startCallback = slot.startRenderCallback;
    slot.startRenderCallback = ({particle, slotName, providedSlots, contentTypes}) => {
      startCallback({particle, slotName, providedSlots, contentTypes});
    };
  }

  /** @method sendEvent(particleName, slotName, event, data)
   * Sends an event to the given particle and slot.
   */
  sendEvent(particleName, slotName, event, data) {
    const particles = this.consumers.filter(s => s.consumeConn.particle.name == particleName).map(s => s.consumeConn.particle);
    assert(1 == particles.length, `Multiple particles with name ${particleName} - cannot send event.`);
    this.pec.sendEvent(particles[0], slotName, {handler: event, data});
  }

  //TODO: reaching directly into data objects like this is super dodgy and we should
  // fix. It's particularly bad here as there's no guarantee that the backingStore
  // exists - should await ensureBackingStore() before accessing it.
  _getHostedParticleNames(particle) {
    return Object.values(particle.connections)
        .filter(conn => conn.type.isInterface)
        .map(conn => {
          const store = this.arc.findStoreById(conn.handle.id);
          if (store.referenceMode) {
            return store.backingStore._model.getValue(store._stored.id).name;
          }
          return store._stored.name;
        });
  }

  async renderSlot(particle, slotName, content) {
    // this._addDebugMessages(`    renderSlot ${particle.name} ${((names) => names.length > 0 ? `(${names.join(',')}) ` : '')(this._getHostedParticleNames(particle))}: ${slotName} - ${Object.keys(content).join(', ')}`);
    // assert.isAbove(this.expectQueue.length, 0,
    //   `Got a renderSlot from ${particle.name}:${slotName} (content types: ${Object.keys(content).join(', ')}), but not expecting anything further.`);

    // renderSlot must happen before _verifyRenderContent, because the latter removes this call from expectations,
    // and potentially making mock-slot-composer idle before the renderSlot has actualy complete.
    // TODO: split _verifyRenderContent to separate method for checking and then resolving expectations.
    await super.renderSlot(particle, slotName, content);

    // let found = this._verifyRenderContent(particle, slotName, content);
    // if (!found) {
    //   let canIgnore = this._canIgnore(particle.name, slotName, content);
    //   if (canIgnore) {
    //     console.log(`Skipping unexpected render slot request: ${particle.name}:${slotName} (content types: ${Object.keys(content).join(', ')})`);
    //   }
    //   assert(canIgnore, `Unexpected render slot ${slotName} for particle ${particle.name} (content types: ${Object.keys(content).join(',')})`);
    // }

    //this._expectationsMet();

    const slotConsumer = this.getSlotConsumer(particle, slotName);
    if (slotConsumer) {
      slotConsumer.updateProvidedContexts();
    } else {
      // Slots of particles hosted in transformation particles.
    }

    //this.detailedLogDebug();
  }

  _expectationsMet() {
    if (this.expectQueue.length == 0 || this.expectQueue.every(e => e.isOptional)) {
      this.onExpectationsComplete();
    }
  }

}
