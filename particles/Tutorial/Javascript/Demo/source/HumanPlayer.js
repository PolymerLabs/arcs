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

defineParticle(({SimpleParticle}) => {

  return class extends SimpleParticle {

    update({gameState, event, player}) {
      if (event && player && gameState && gameState.currentPlayer == player.id) {
        this.set('myMove', event);
      }
    }

  };
});
