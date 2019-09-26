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

    update({gameState, humanMove, computerMove, players}, {mvs}) {
      // mvs lets us make sure the computer does not become over eager
      // and fill the whole board due to async updating of handles.
      if (!mvs) {
        this.setState({mvs: 1});
      }
      if (gameState && humanMove && computerMove && players) {
        if (!gameState.gameOver ) { 
          // Find the current player. Note the +1 is because the conputer
          // is the first element of players, but we want the computer
          // to make the final move in each round.
          const currPlayer = (gameState.moves + 1) % players.length;
          // If the current move is not the computer
          if (currPlayer != 0) {
            // Set the current move to be the humanMove, and update
            // the avatar. Note that if the player has not moved yet
            // this will be an invalid move, so MoveApplier will 
            // ignore it until a proper move is applied.
            const mv = {
              move: humanMove.move, 
              playerAvatar: players[currPlayer].avatar
            };
            this.updateSingleton('move', mv);
            this.setState({mvs: gameState.moves});
          } else if (mvs < (gameState.moves + gameState.attemptedMoves)) { 
            // This if ensures the computer only can move after gameState
            // has been updated.   
            const mv = {
              move: computerMove.move, 
              playerAvatar: players[currPlayer].avatar
            };        
            this.updateSingleton('move', mv);
            // Update mvs to make sure the computer won't takeover the game
            // while gameState updates.
            this.setState({mvs: gameState.moves + gameState.attemptedMoves + 1});
          }  
        } 
      }
    }
  };
});

