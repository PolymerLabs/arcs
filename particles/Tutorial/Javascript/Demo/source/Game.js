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
defineParticle(({SimpleParticle, html, log}) => {

  return class extends SimpleParticle {

    get template() {
      return html`
      <b>Please enter your name:</b>
      <input value="{{name}}" placeholder="Enter your name" spellcheck="false" on-change="onNameInputChange">
      <div slotid="greetingSlot"></div>
      <span>{{turnMessage}}</span>
      <div slotid="gameSlot"></div>
      <div hidden={{hideCongrats}}><span>{{congrats}}</span></div>
    `;
    }

    shouldRender({gameState}) {
      return gameState;
    }

    render({gameState, humanMove, computerMove, humanPlayer, computerPlayer, move}) {
      const toReturn = {hideCongrats: true};
      if (!move) {
        this.set('move', {move: 'reset'});
        return;
      }

      if (!humanPlayer) {
        this.set('humanPlayer', {name: 'Human', avatar: '🧑'});
        return;
      }

      if (!computerPlayer) {
        this.set('computerPlayer', {name: 'Computer', avatar: '🤖'});
        return;
      }

      // If the move has been applied, and the game isn't over
      if (gameState.lastMove == move.move && !gameState.gameOver) {

        if (gameState.currentPlayer == 0) {
          toReturn.turnMessage = `It is your move, ${humanPlayer.name}.`;
          if (humanMove && humanMove.move != move.move) {
            this.set('move', {move: humanMove.move, playerAvatar: humanPlayer.avatar});
            this.set('humanMove', {move: ''});
          }
        }

        if (gameState.currentPlayer == 1) {
          toReturn.turnMessage = `It is ${computerPlayer.avatar}'s move, please wait.`;
          if (computerMove && computerMove.move != move.move) {
            this.set('move', {move: computerMove.move, playerAvatar: computerPlayer.avatar});
            this.set('computerMove', {move: ''});
          }
        }
      }

      if (gameState.gameOver) {
        if (humanMove && humanMove.move == 'reset') {
          this.set('move', {move: 'reset'});
          this.set('humanMove', {move: ''});
          this.set('computerMove', {move: ''});
          return;
        }

        // Set congratulations message based on winner
        toReturn.hideCongrats = false;
        if (gameState.winnerAvatar !== null) {
          if (gameState.winnerAvatar == humanPlayer.avatar) {
            toReturn.congrats = `Congratulations ${humanPlayer.name}, you won!`;
          } else {
            toReturn.congrats = `Better luck next time... ${computerPlayer.avatar} won.`;
          }
        } else {
          toReturn.congrats = `It's a tie!`;
        }
      }
      return toReturn;
    }

    onNameInputChange(e) {
      this.set('humanPlayer', {name: e.data.value, avatar: '🧑'});
    }
  };
});
