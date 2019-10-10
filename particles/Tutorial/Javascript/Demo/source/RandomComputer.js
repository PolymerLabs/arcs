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

defineParticle(({SimpleParticle, html}) => {

  function getMove(b) {
    const emptyCells = [];
      const board = b.split(`,`);
      // Determine which cells are empty.
      for (let i = 0; i < board.length; i++) {
        if (board[i] == ``) {
          emptyCells.push((i + 1).toString());
        }
      }

      return emptyCells[Math.floor(Math.random() * emptyCells.length).toString()];
  }

  return class extends SimpleParticle {

    update({gameState}) {
      if (!gameState) {
        return;
      }


      if (gameState.currentPlayer == 1) {
        const emptyCells = [];
        const board = gameState.board.split(`,`);
        // Determine which cells are empty.
        for (let i = 0; i < board.length; i++) {
          if (board[i] == ``) {
            emptyCells.push((i + 1).toString());
          }
        }

        const selection = Math.floor(Math.random() * emptyCells.length);

        setTimeout(() => this.set('computerMove', {move: getMove(gameState.board)}), 4000);
      }
    }
  };
});
