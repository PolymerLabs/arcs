/**
 * @license
 * Copyright (c) 2018 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {UiSlotComposer as SlotComposer, SlotComposerOptions} from '../ui-slot-composer.js';
import {Arc} from '../arc.js';
import {Particle} from '../recipe/particle.js';

/**
 * A helper class for NodeJS tests that mimics SlotComposer without relying on DOM APIs.
 */
export class FakeSlotComposer extends SlotComposer {
  constructor(options: SlotComposerOptions = {}) {
    super();
  }
}

/**
 * A helper SlotComposer that records renderSlot calls.
 *
 *   I'm watching you, Wazowski. Always watching...
 */
export class RozSlotComposer extends FakeSlotComposer {
  // To make test assertions more concise, renderSlot calls are recorded as tuples of
  // (particle-name, slot-name, render-content) rather than objects with similarly named keys.
  // tslint:disable-next-line: no-any
  public received: [string, string, any][] = [];

  /** Listener for experimental `output` implementation */
  delegateOutput(arc: Arc, particle: Particle, content) {
    const slotName: string = content && content.targetSlot && content.targetSlot.name || 'root';
    this.received.push([particle.name, slotName, content]);
  }
}
