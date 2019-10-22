/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
'use strict';

defineParticle(({Particle, MultiplexerDomParticle}) => {
  return class SlandleMultiplexer extends MultiplexerDomParticle {
    constructInnerRecipe(hostedParticle, item, itemHandle, slot, other) {
      const recipe = Particle.buildManifest`
${hostedParticle}
recipe
  use '${itemHandle._id}' as handle1
  ${other.handles.join('\n')}
  \`slot '${slot.id}' as handle2
  ${hostedParticle.name}
    ${hostedParticle.handleConnections[0].name}: in handle1
    ${hostedParticle.handleConnections[1].name}: \`consume handle2
    ${other.connections.join('\n')}
  `;
      return recipe;
    }
  };
});
