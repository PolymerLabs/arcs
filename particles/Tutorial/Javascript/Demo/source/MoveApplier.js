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

  return class extends SimpleParticle {
    update({move, gameState}, {}) {
      // If the move is reset or start, reset the gameState
      if (move && (move.move == 'start' || move.move == 'reset')) {
        const gs = {
          board: ',,,,,,,,',
          gameOver: false,
          winnerAvatar: null,
          currentPlayer: 1,
          lastMove: '',
          gameStarted: true
        };
        this.updateSingleton('gameState', gs);
      }
      if (move && gameState && gameState.lastMove != move.move) {
        // Get the old gameState values to update.
        let newBoard = gameState.board;
        let newGameOver = gameState.gameOver;
        let newWinnerAvatar = gameState.winnerAvatar;
        let newCurrentPlayer = gameState.currentPlayer;

        // Get the board and move in a usable state
        const arr = gameState.board.split(`,`);
        const mv = parseInt(move.move, 10) - 1;
        
        // If the move is valid
        if (arr[mv] == ``) {

          // Apply move
          arr[mv] = move.playerAvatar;
          newBoard = arr.join();

          // Define all the possible winning sequences
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

          // Check if the game is tied
          newGameOver = true;
          for (const cell of arr) {
            if (cell == '') {
              newGameOver = false;
              break;
            }
          }
          
          // Check if the game has been won
          for (const ws of winningSequences) {
            if (arr[ws[0]] !== '' && arr[ws[0]] === arr[ws[1]] && arr[ws[1]] == arr[ws[2]]) {
              newGameOver = true;
              newWinnerAvatar = arr[ws[0]];
              break;
            }
          }
          
          newCurrentPlayer = newCurrentPlayer % 2 + 1;
        } 
        // Update gameState
        const gs = {
          board: newBoard,
          gameOver: newGameOver,
          winnerAvatar: newWinnerAvatar,
          currentPlayer: newCurrentPlayer,
          lastMove: move.move,
          gameStarted: gameState.gameStarted
        };
        this.updateSingleton('gameState', gs);
      }
    }
  };
});