/**
 * @license
 * Copyright (c) 2018 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
'use strict';

import {SlotComposer} from '../ts-build/slot-composer.js';

/** @class FakeSlotComposer
 * A helper class for NodeJS tests that mimics SlotComposer without relying on DOM APIs.
 */
export class FakeSlotComposer extends SlotComposer {

  constructor(options = {}) {
    super(Object.assign({
      rootContainer: {'root': 'root-context'},
      modality: 'mock'
    }, options));
  }

  async renderSlot(particle, slotName, content) {
    await super.renderSlot(particle, slotName, content);

    // In production updateProvidedContexts() is done in DOM Mutation Observer.
    // We don't have it in tests, so we do it here.
    const slotConsumer = this.getSlotConsumer(particle, slotName);
    if (slotConsumer) slotConsumer.updateProvidedContexts();
  }
}
