/**
 * @license
 * Copyright (c) 2018 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {PlanningModalityHandler} from '../../planning/planning-modality-handler.js';
import {Modality} from '../modality.js';
import {SlotComposer, SlotComposerOptions} from '../slot-composer.js';

/**
 * A helper class for NodeJS tests that mimics SlotComposer without relying on DOM APIs.
 */
export class FakeSlotComposer extends SlotComposer {
  constructor(options: SlotComposerOptions = {}) {
    super({
      rootContainer: {'root': 'root-context'},
      modalityHandler: PlanningModalityHandler.createHeadlessHandler(),
      ...options});
  }

  async renderSlot(particle, slotName, content) {
    await super.renderSlot(particle, slotName, content);

    // In production updateProvidedContexts() is done in DOM Mutation Observer.
    // We don't have it in tests, so we do it here.
    const slotConsumer = this.getSlotConsumer(particle, slotName);
    if (slotConsumer) slotConsumer.updateProvidedContexts();
  }
  // Accessors for testing.
  get contexts() {
    return this._contexts;
  }
}
