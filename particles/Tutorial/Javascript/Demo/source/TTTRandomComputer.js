/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

/* global defineParticle */

defineParticle(({SimpleParticle}) => class extends SimpleParticle {

  update({gameState, player}) {
    if (!gameState) {
      return;
    }

    if (player && gameState.currentPlayer === player.id) {
      const emptyCells = [];
      const board = JSON.parse(gameState.board);
      // Determine which cells are empty.
      for (let i = 0; i < board.length; i++) {
        if (board[i] === '') {
          emptyCells.push(i);
        }
      }

      const selection = Math.floor(Math.random() * emptyCells.length);
      this.set('computerMove', {move: emptyCells[selection]});
    }
  }
});
