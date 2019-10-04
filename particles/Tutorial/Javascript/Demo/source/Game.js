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
defineParticle(({SimpleParticle, html}) => {

  return class extends SimpleParticle {

    get template() {
      return html`
      <b>Please enter your name:</b>
      <input value="{{name}}" placeholder="Enter your name" spellcheck="false" on-change="onNameInputChange">
      <div slotid="greetingSlot"></div>
      <span>{{turnMessage}}</span>
      <div slotid="cellSlot"></div>
      <div hidden={{hideCongrats}}><span>{{startmsg}}</span> Please hit reset to start a new game. <button on-click="reset">Reset</button></div>
    `;
    }

    render({gameState, humanMove, computerMove, humanPlayer, computerPlayer, move}) {
      const toReturn = {hideCongrats: true};
      if (!move) {
        this.set('move', {move: 'start'});
      }

      if (!humanPlayer) {
        this.set('humanPlayer', {name: 'Human', avatar: '🧑'});
      }

      if (!computerPlayer) {
        this.set('computerPlayer', {name: 'Computer', avatar: '🤖'});
      }

      if (humanMove && computerMove && move && humanPlayer && computerPlayer && gameState) {
        // If the move has been applied, and the game isn't over
        if (gameState.lastMove == move.move && !gameState.gameOver) {
          if (gameState.currentPlayer == 0) {
            toReturn.turnMessage = `It is your move, ${humanPlayer.name}.`;
            this.set('move', {move: humanMove.move, playerAvatar: humanPlayer.avatar});
          } else if (gameState.currentPlayer == 1) {
            toReturn.turnMessage = `It is ${computerPlayer.avatar}'s move, please wait.`;
            this.set('move', {move: computerMove.move, playerAvatar: computerPlayer.avatar});
          }
        }
      }

      // If the game is over
      if (humanPlayer && computerPlayer && gameState && gameState.gameOver) {
        toReturn.hideCongrats = false;
        if (gameState.winnerAvatar !== null) {
          if (gameState.winnerAvatar == humanPlayer.avatar) {
            toReturn.startmsg = `Congratulations ${humanPlayer.name}, you won!`;
          } else {
            toReturn.startmsg = `Better luck next time... ${computerPlayer.avatar} won.`;
          }
        }
      }
      return toReturn;
    }

    reset() {
      this.set('move', {move: 'reset'});
    }

    onNameInputChange(e) {
      this.set('humanPlayer', {name: e.data.value, avatar: '🧑'});
    }
  };
});
