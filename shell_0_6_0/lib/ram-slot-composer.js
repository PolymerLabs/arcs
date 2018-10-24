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

import {SlotComposer} from '../../runtime/ts-build/slot-composer.js';

export class RamSlotComposer extends SlotComposer {
  constructor(options) {
    options = options || {};
    super({rootContainer: options.rootContainer || {'root': 'root-context'}, affordance: 'mock'});
  }

   // Overriding this method to investigate AppVeyor failures.
   // TODO: get rid of it once the problem is fixed.
  _addSlotConsumer(slot) {
    super._addSlotConsumer(slot);
    const startCallback = slot.startRenderCallback;
    slot.startRenderCallback = ({particle, slotName, contentTypes}) => {
      startCallback({particle, slotName, contentTypes});
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
    await super.renderSlot(particle, slotName, content);
    const slotConsumer = this.getSlotConsumer(particle, slotName);
    if (slotConsumer) {
      slotConsumer.updateProvidedContexts();
    } else {
      // Slots of particles hosted in transformation particles.
    }
  }
}
