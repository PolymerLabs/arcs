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

defineParticle(({SimpleParticle}) => {

  const winningSequences = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6]
  ];

  return class extends SimpleParticle {
    update({move, gameState}) {
      if (!gameState || (move && move.move == 'reset' && gameState.lastMove != 'reset')) {
        const gs = {
          board: ',,,,,,,,',
          gameOver: false,
          winnerAvatar: null,
          currentPlayer: Math.floor(Math.random() * 2),
          lastMove: 'reset',
        };
        this.set('gameState', gs);
        return;
      }

      if (move && move.move != gameState.lastMove) {
        const gs = {
          board: gameState.board,
          gameOver: gameState.gameOver,
          winnerAvatar: gameState.winnerAvatar,
          currentPlayer: gameState.currentPlayer,
          lastMove: move.move,
        };

        const arr = gameState.board.split(`,`);
        const mv = parseInt(move.move, 10) - 1;

        // If the move is valid, apply move
        if (arr[mv] == ``) {
          arr[mv] = move.playerAvatar;
          gs.board = arr.join();
          gs.currentPlayer = (gameState.currentPlayer + 1) % 2;
        }

        // Check if the game is tied
        gs.gameOver = true;
        for (const cell of arr) {
          if (cell == '') {
            gs.gameOver = false;
            break;
          }
        }

        // Check if the game has been won
        for (const ws of winningSequences) {
          if (arr[ws[0]] !== '' && arr[ws[0]] === arr[ws[1]] && arr[ws[1]] == arr[ws[2]]) {
            gs.gameOver = true;
            gs.winnerAvatar = arr[ws[0]];
            break;
          }
        }

        this.set('gameState', gs);
        return;
      }
    }
  };
});
