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

    update({move, gameState}, state) {
      if (!gameState) { // Gamestate has not been set yet
        console.log(`setting gameState`);
        this.updateSingleton('gameState', {gameOver: false, moves: 0, board: ',,,,,,,,,'});
      }
      if (move) {
        if (gameState) {
          //console.log(`board: `, gameState.board);
          const arr = gameState.board.split(`,`);
          const mv = parseInt(move.move, 10) - 1;
          arr[mv] = move.playerId;
          this.updateSingleton('gameState', {board: arr.join(), moves: gameState.moves + 1});
        }
      }
    }
  };
});