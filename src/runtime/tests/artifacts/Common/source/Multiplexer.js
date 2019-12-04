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

defineParticle(({Particle, MultiplexerDomParticle}) => {
  return class Multiplexer extends MultiplexerDomParticle {
    constructInnerRecipe(hostedParticle, item, itemHandle, slot, other) {
      const recipe = Particle.buildManifest`
${hostedParticle}
recipe
  handle1: use '${itemHandle._id}'
  ${other.handles.join('\n')}
  slot1: slot '${slot.id}'
  ${hostedParticle.name}
    ${hostedParticle.handleConnections[0].name}: reads handle1
    ${other.connections.join('\n')}
    ${slot.name}: consumes slot1
  `;
      return recipe;
    }
  };
});
