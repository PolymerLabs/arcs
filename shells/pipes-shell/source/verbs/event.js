/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {logsFactory} from '../../../../build/runtime/log-factory.js';

const {log} = logsFactory('pipe::event');

export const event = async (msg, tid, bus) => {
  // find the arc from the tid in the message (not the tid for this request)
  const arc = await bus.getAsyncValue(msg.tid);
  if (arc) {
    // find the particle from the pid in the message
    const particle = arc.activeRecipe.particles.find(
      particle => String(particle.id) === msg.pid
    );
    if (particle) {
      log('firing PEC event for', particle.name);
      // TODO(sjmiles): we need `arc` and `particle` here even though
      // the two are bound together, figure out how to simplify
      arc.pec.sendEvent(particle, /*slotName*/'', msg.eventlet);
    }
  }
};
