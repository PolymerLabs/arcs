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

    update({playerOne, playerTwo, gameState, humanMove, computerMove, players}, {mvs}) {
      if (!mvs) {
        this.setState({mvs: 1});
      }
      if (playerOne && playerTwo && gameState && humanMove && computerMove && players) {
        if (!gameState.gameOver ) { 
          const currPlayer = (gameState.moves + 1) % players.length;
          if (currPlayer != 0) {
            this.updateSingleton('move', {move: humanMove.move, playerAvatar: players[currPlayer].avatar});
            this.setState({mvs: gameState.moves});
          } else if (mvs < (gameState.moves + gameState.attemptedMoves)) {            
            this.updateSingleton('move', {move: computerMove.move, playerAvatar: playerTwo.avatar});
            this.setState({mvs: gameState.moves + gameState.attemptedMoves + 2});
          }  
        } 
      }
    }
  };
});

