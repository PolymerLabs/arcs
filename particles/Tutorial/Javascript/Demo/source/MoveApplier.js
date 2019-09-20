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
        this.updateSingleton('gameState', {gameOver: false, moves: 0, board: ',,,,,,,,,'});
        this.setState({lastMove: ``});
      } else if (move && move.move != lastMove) {
        this.setState({lastMove: move.move});
        const arr = gameState.board.split(`,`);
        const mv = parseInt(move.move, 10) - 1;
        arr[mv] = move.playerAvatar;
        this.updateSingleton('gameState', {board: arr.join(), moves: gameState.moves + 1});

        if (this.checkIfWon(arr[0], arr[1], arr[2])) {
         this.updateSingleton('gameState', {board: arr.join(), moves: gameState.moves + 1, gameOver: true, winnerAvatar: arr[0]});
        } else if (this.checkIfWon(arr[3], arr[4], arr[5])) {
          this.updateSingleton('gameState', {board: arr.join(), moves: gameState.moves + 1, gameOver: true, winnerAvatar: arr[3]});
        } else if (this.checkIfWon(arr[6], arr[7], arr[8])) {
          this.updateSingleton('gameState', {board: arr.join(), moves: gameState.moves + 1, gameOver: true, winnerAvatar: arr[6]});
        } else if (this.checkIfWon(arr[0], arr[3], arr[6])) {
          this.updateSingleton('gameState', {board: arr.join(), moves: gameState.moves + 1, gameOver: true, winnerAvatar: arr[0]});
        } else if (this.checkIfWon(arr[1], arr[4], arr[6])) {
          this.updateSingleton('gameState', {board: arr.join(), moves: gameState.moves + 1, gameOver: true, winnerAvatar: arr[1]});
        } else if (this.checkIfWon(arr[2], arr[5], arr[8])) {
          this.updateSingleton('gameState', {board: arr.join(), moves: gameState.moves + 1, gameOver: true, winnerAvatar: arr[2]});
        } else if (this.checkIfWon(arr[0], arr[4], arr[8])) {
          this.updateSingleton('gameState', {board: arr.join(), moves: gameState.moves + 1, gameOver: true, winnerAvatar: arr[0]});
        } else if (this.checkIfWon(arr[2], arr[4], arr[6])) {
          this.updateSingleton('gameState', {board: arr.join(), moves: gameState.moves + 1, gameOver: true, winnerAvatar: arr[2]});
        } else if (gameState.moves == 8) {
          this.updateSingleton('gameState', {board: arr.join(), moves: gameState.moves + 1, gameOver: true});
        }

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