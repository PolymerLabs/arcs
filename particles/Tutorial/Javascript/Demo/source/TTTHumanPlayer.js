/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

'use strict';

/* global defineParticle */

defineParticle(({SimpleParticle}) => class extends SimpleParticle {
  update({gameState, events, player}) {
    if (events && player && gameState) {
      if (events.length && gameState.currentPlayer === player.id) {
        const reset = events.find(e => e.type === 'reset');
        if (!reset) {
          const e = events.sort(function(a, b) { return b.time - a.time; });
          this.set('myMove', {move: e[0].move});
        }
      }
    }
  }
});
