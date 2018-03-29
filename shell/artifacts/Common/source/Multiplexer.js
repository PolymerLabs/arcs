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
    constructInnerRecipe(hostedParticle, item, itemView, slot, other) {
      let recipe = Particle.buildManifest`
${hostedParticle}
recipe
  use '${itemView._id}' as v1
  ${other.views.join('\n')}
  slot '${slot.id}' as s1
  ${hostedParticle.name}
    ${hostedParticle.connections[0].name} <- v1
    ${other.connections.join('\n')}
    consume ${slot.name} as s1
  `;
      return recipe;
    }
  };
});
