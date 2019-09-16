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
// TODO (heimlich@) change to particle
defineParticle(({DomParticle, log}) => { 

  return class extends DomParticle {

    get template() {
      return '';
    }

    update({playerOne, playerTwo, gameState}, {initialised}) {
      if (playerOne && playerTwo && gameState) {
        if (gameState.gameOver) {
          if (gameState.winnerId == playerOne.playerId) {
            this.updateSingleton('currentPlayer', playerOne);
            this.updateSingleton('currentPlayerId', {id2: playerOne.id2});
          } else if (gameState.winnerId == playerOne.playerId) {
            this.updateSingleton('currentPlayer', playerTwo);
            this.updateSingleton('currentPlayerId', {id2: playerTwo.id2});
          }
        } else if (gameState.moves % 2 == 0) {
          this.updateSingleton('currentPlayer', playerOne);
          this.updateSingleton('currentPlayerId', {id2: playerOne.id2});
        } else {
          this.updateSingleton('currentPlayer', playerTwo);
          this.updateSingleton('currentPlayerId', {id2: playerTwo.id2});
        }
      }
    }
  };
});

