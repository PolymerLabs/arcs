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

/* global defineParticle */

defineParticle(({Particle, UiMultiplexerParticle, log}) => {

  const composeRecipeManifest = (hostedParticle, itemHandle, slot, other) => {
    const otherHandles = other.handles.length ? `\n  ${other.handles.join('\n  ')}` : '';
    const otherConnections = other.connections.length ? `\n    ${other.connections.join('\n    ')}` : '';
    return Particle.buildManifest`
${hostedParticle}
recipe
  handle1: use '${itemHandle._id}'${otherHandles}${slot ? `
  slot1: slot '${slot.id}'` : ''}
  ${hostedParticle.name}
    ${hostedParticle.handleConnections[0].name}: reads handle1${otherConnections}${slot ? `
    ${slot.name}: consumes slot1` : ''}`;
  };

  return class Multiplexer extends UiMultiplexerParticle {
    constructInnerRecipe(hostedParticle, item, itemHandle, slot, other) {
      const manifest = composeRecipeManifest(hostedParticle, itemHandle, slot, other);
      //log(`constructInnerRecipe for [${hostedParticle.name}]:\n`, manifest);
      return manifest;
    }
  };

});
