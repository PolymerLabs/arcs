/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import {PlanningModalityHandler} from '../../build/planning/planning-modality-handler.js';
import {SlotComposer} from '../../build/runtime/slot-composer.js';

export class RamSlotComposer extends SlotComposer {
  constructor(options = {}) {
    super({
      rootContainer: options.rootContainer || {'root': 'root-context'},
      modalityName: options.modalityName,
      modalityHandler: PlanningModalityHandler.createHeadlessHandler()
    });
  }

  sendEvent(particleName, slotName, event, data) {
    const particles = this.consumers.filter(s => s.consumeConn.particle.name == particleName).map(s => s.consumeConn.particle);
    assert(1 == particles.length, `Multiple particles with name ${particleName} - cannot send event.`);
    this.pec.sendEvent(particles[0], slotName, {handler: event, data});
  }

  async renderSlot(particle, slotName, content) {
    await super.renderSlot(particle, slotName, content);
    const slotConsumer = this.getSlotConsumer(particle, slotName);
    if (slotConsumer) {
      slotConsumer.updateProvidedContexts();
    }
  }
}
