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
defineParticle(({SimpleParticle}) => { 

  return class extends SimpleParticle {

    update({gameState, humanMove, computerMove, playerOne, playerTwo, move}) {
      if (!move) {
        this.updateSingleton('move', {});
      }
      // If both the players exist, but we don't have a human move yet, then
      // start the game!
      if (playerOne && playerTwo && !humanMove) {
        this.updateSingleton('move', {move: 'start'});
      }
      if (gameState && humanMove && computerMove && playerOne && playerTwo) {
        if (humanMove.move == 'reset') {
          this.updateSingleton('move', humanMove);
          return;
        }
        if (!gameState.gameOver && gameState.lastMove == move.move) { 
          // If the current player is the human, and the current move is not already the human
          // input.
          if (gameState.currentPlayer == 1 && move.move != humanMove.move) {
            // Set the current move to be the humanMove, and update the avatar.
            const mv = {
              move: humanMove.move, 
              playerAvatar: playerOne.avatar
            };
            this.updateSingleton('move', mv);
            const pOne = {
              name: playerOne.name,
              avatar: playerOne.avatar,
              myTurn: true
            };
            const pTwo = {
              name: playerTwo.name,
              avatar: playerTwo.avatar,
              myTurn: false
            };
            this.updateSingleton('playerOne', pOne);
            this.updateSingleton('playerTwo', pTwo);
          } else if (gameState.currentPlayer == 2) {  
            const mv = {
              move: computerMove.move, 
              playerAvatar: playerTwo.avatar
            };  
            this.updateSingleton('move', mv);
          }  
        } 
      }
    }
  };
});

