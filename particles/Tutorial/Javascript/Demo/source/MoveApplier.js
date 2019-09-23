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

 defineParticle(({DomParticle, html}) => {

  return class extends DomParticle {
    get template() {
      return '';
    }

    update({move, gameState}, {}) {
      if (!gameState) { // Gamestate has not been set yet
        const gs = {
          board: ',,,,,,,,,',
          moves: 0,
          gameOver: false,
          winnerAvatar: null,
          attemptedMoves: 0
        };
        this.updateSingleton('gameState', gs);
      } else if (move) {
        // Get the old gameState values to update.
        let newMoves = gameState.moves;
        let newBoard = gameState.board;
        let newAttemptedMoves = gameState.attemptedMoves;
        let newGameOver = gameState.gameOver;
        let newWinnerAvatar = gameState.winnerAvatar;

        // Get the board and move in a usable state
        const arr = gameState.board.split(`,`);
        const mv = parseInt(move.move, 10) - 1;
        
        // If the move is valid
        if (arr[mv] == ``) {
          // Apply move
          arr[mv] = move.playerAvatar;
          newBoard = arr.join();
          newMoves = newMoves + 1;
          // Check if the game is over
          if (this.checkIfWon(arr[0], arr[1], arr[2])) { // top row
            newGameOver = true;
            newWinnerAvatar = arr[0];
          } else if (this.checkIfWon(arr[3], arr[4], arr[5])) { // middle row
            newGameOver = true;
            newWinnerAvatar = arr[3];
          } else if (this.checkIfWon(arr[6], arr[7], arr[8])) { // bottom row
            newGameOver = true;
            newWinnerAvatar = arr[6];
          } else if (this.checkIfWon(arr[0], arr[3], arr[6])) { // left col
            newGameOver = true;
            newWinnerAvatar = arr[0];
          } else if (this.checkIfWon(arr[1], arr[4], arr[7])) { // middle col
            newGameOver = true;
            newWinnerAvatar = arr[1];
          } else if (this.checkIfWon(arr[2], arr[5], arr[8])) { // right col
            newGameOver = true;
            newWinnerAvatar = arr[2];
          } else if (this.checkIfWon(arr[0], arr[4], arr[8])) { // L-R diag
            newGameOver = true;
            newWinnerAvatar = arr[0];
          } else if (this.checkIfWon(arr[2], arr[4], arr[6])) { // R-: diag
            newGameOver = true;
            newWinnerAvatar = arr[2];
          } else if (newMoves == 9) { // Tied game
            newGameOver = true;
          }
        } else {
          newAttemptedMoves++;
        }
        const gs = {
          board: newBoard,
          moves: newMoves,
          gameOver: newGameOver,
          winnerAvatar: newWinnerAvatar,
          attemptedMoves: newAttemptedMoves
        };
        this.updateSingleton('gameState', gs);
      }
    }

    checkIfWon(winner1, winner2, winner3) {
      if (winner1 != ``) {
        if (winner1 == winner2) {
          if (winner2 == winner3) {
            return true;
          }
        }
      }
      return false;
    }
  };
});