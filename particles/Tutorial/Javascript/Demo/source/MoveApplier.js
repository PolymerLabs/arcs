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

    update({move, gameState}, {lastMove}) {
      if (!gameState) { // Gamestate has not been set yet
        this.updateSingleton('gameState', {gameOver: false, moves: 0, board: ',,,,,,,,,', attemptedMoves: 0});
        this.setState({lastMove: ``});
      } else if (move) {
        console.log(`move: `, move);
        const arr = gameState.board.split(`,`);
        const mv = parseInt(move.move, 10) - 1;
        let newMoves = gameState.moves;
        let newBoard = gameState.board;
        let newAttemptedMoves = gameState.attemptedMoves;
        let newGameOver = gameState.gameOver;
        let winnerAv = ``;
        //this.setState({lastMove: move.move});
        if (arr[mv] == ``) {
          console.log(`applying Move`);
          arr[mv] = move.playerAvatar;
          newBoard = arr.join();
          newMoves = newMoves + 1;
          if (this.checkIfWon(arr[0], arr[1], arr[2])) {
            newGameOver = true;
            winnerAv = arr[0];
          } else if (this.checkIfWon(arr[3], arr[4], arr[5])) {
            newGameOver = true;
            winnerAv = arr[0];
          } else if (this.checkIfWon(arr[6], arr[7], arr[8])) {
            newGameOver = true;
            winnerAv = arr[0];
          } else if (this.checkIfWon(arr[0], arr[3], arr[6])) {
            newGameOver = true;
            winnerAv = arr[0];
          } else if (this.checkIfWon(arr[1], arr[4], arr[6])) {
            newGameOver = true;
            winnerAv = arr[0];
          } else if (this.checkIfWon(arr[2], arr[5], arr[8])) {
            newGameOver = true;
            winnerAv = arr[0];
          } else if (this.checkIfWon(arr[0], arr[4], arr[8])) {
            newGameOver = true;
            winnerAv = arr[0];
          } else if (this.checkIfWon(arr[2], arr[4], arr[6])) {
            newGameOver = true;
            winnerAv = arr[0];
          } else if (gameState.moves == 8) {
            newGameOver = true;
            winnerAv = arr[0];
          }
        } else {
          newAttemptedMoves++;
          console.log(`invalid move, try again`);
        }
        const gs = {
          board: newBoard,
          moves: newMoves,
          gameOver: newGameOver,
          winnerAvatar: winnerAv,
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