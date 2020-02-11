/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

export const event = async ({pid, particleId, eventlet}, runtime) => {
  // TODO(sjmiles): support either key for particleId (for backward compat)
  const id = particleId || pid;
  const arc = runtime.findArcByParticleId(id);
  arc.pec.slotComposer.sendEvent(id, eventlet);
};
