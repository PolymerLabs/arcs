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
const resetMove = {type: 'reset', move: -1};
const clearMove = {type: 'clear', move: -1};

/* global defineParticle */
defineParticle(({SimpleParticle, html, log}) => {

  return class extends SimpleParticle {

    get template() {
      return html`
      <span>It is your turn <span>{{name}}</span>, playing as <span>{{avatar}}</span>.
      <div slotid="gameSlot"></div>
      <div hidden={{hideCongrats}}>Congratulations <span>{{winnerName}}</span>!</div>
    `;
    }

    shouldRender({gameState, playerOne, playerTwo}) {
      return gameState && playerOne && playerTwo;
    }

    render({gameState, playerOneMove, playerTwoMove, playerOne, playerTwo, move, event}) {
      const toReturn = {hideCongrats: true};
      if (!move) {
        this.set('move', resetMove);
        return toReturn;
      }

      if (playerOne.id != 0) {
        this.set('playerOne', {name: playerOne.name, avatar: playerOne.avatar, id: 0});
        return toReturn;
      }

      if (!playerTwo.id) {
        this.set('playerTwo', {name: playerTwo.name, avatar: playerTwo.avatar, id: 1});
        return toReturn;
      }

      // If the move has been applied, and the game isn't over
      if (gameState.lastMove == move.move && !gameState.gameOver) {

        if (gameState.currentPlayer == 0) {
          toReturn.name = playerOne.name;
          toReturn.avatar = playerOne.avatar;
          if (playerOneMove && playerOneMove.move != -1) {
            this.set('move', {move: playerOneMove.move, playerAvatar: playerOne.avatar});
            this.clearPlayerMoves();
          }
        }

        if (gameState.currentPlayer == 1) {
          toReturn.name = playerTwo.name;
          toReturn.avatar = playerTwo.avatar;
          if (playerTwoMove && playerTwoMove.move != -1) {
            this.set('move', {move: playerTwoMove.move, playerAvatar: playerTwo.avatar});
            this.clearPlayerMoves();
          }
        }
      }

      if (gameState.gameOver) {
        if (event && event.type == 'reset') {
          this.set('move', resetMove);
          this.clearPlayerMoves();
          return;
        }

        // Set congratulations message based on winner
        toReturn.hideCongrats = false;
        if (gameState.winnerAvatar !== null) {
          if (gameState.winnerAvatar == playerOne.avatar) {
            toReturn.winnerName = playerOne.name;
          } else {
            toReturn.winnerName = playerTwo.name;
          }
        } else {
          toReturn.winnerName = `it's a tie`;
        }
      }
      return toReturn;
    }

    clearPlayerMoves() {
      this.set('playerOneMove', clearMove);
      this.set('playerTwoMove', clearMove);
      this.set('event', clearMove);
    }
  };
});
