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

  const template = html`
It is your turn <span>{{playerDetails}}</span>.
<div slotid="gameSlot"></div>
<div hidden="{{hideCongrats}}">Congratulations <span>{{winnerName}}</span>!</div>`;

  return class extends SimpleParticle {

    get template() {
      return template;
    }

    shouldRender({gameState, playerOne, playerTwo}) {
      return gameState && playerOne.id === 0 && playerTwo.id === 1;
    }

    update({gameState, playerOne, playerTwo, playerOneMove, playerTwoMove, events}) {

      if (playerOne.id != 0) {
        this.set('playerOne', {name: playerOne.name, avatar: playerOne.avatar, id: 0});
      }

      if (!playerTwo.id) {
        this.set('playerTwo', {name: playerTwo.name, avatar: playerTwo.avatar, id: 1});
      }

      if (!gameState) {
        this.newGame();
      }

      if (gameState && gameState.gameOver && events) {
        const reset = events.find(e => e.type === 'reset');
        if (reset) {
          this.newGame();
        }
      }

      if (gameState && !gameState.gameOver) {
        const mv = [playerOneMove.move, playerTwoMove.move][gameState.currentPlayer];
        const avatar = [playerOne.avatar, playerTwo.avatar][gameState.currentPlayer];
        // Create a local mutable copy of gameState to manipulate.
        let gs = {...gameState};
        gs.board = JSON.parse(gs.board);
        if (this.isMoveValid(gs, mv)) {
          gs = this.applyMove(gs, mv, avatar);
          gs = this.applyGameStatus(gs, playerOne, playerTwo);
          gs.board = JSON.stringify(gs.board);
          this.set('gameState', gs);
        }
      }
    }

    render({gameState, playerOne, playerTwo}) {
      return {
        hideCongrats: !gameState.gameOver,
        playerDetails: this.getPlayerDetails(gameState.currentPlayer, playerOne, playerTwo),
        winnerName: gameState.winnerId !== null ? this.getPlayerDetails(gameState.winnerId, playerOne, playerTwo) : `it's a tie`
      };
    }

    newGame() {
      this.set('playerOneMove', {});
      this.set('playerTwoMove', {});
      this.clear('events');
      this.set('gameState', {
        board: JSON.stringify(['', '', '', '', '', '', '', '', '']),
        gameOver: false,
        winnerId: null,
        currentPlayer: Math.floor(Math.random() * 2)
      });
    }

    isMoveValid(gs, mv) {
      return mv > -1 && mv < 10 && gs.board[mv] === '';
    }

    applyMove(gs, mv, avatar) {
      gs.board[mv] = avatar;
      gs.currentPlayer = (gs.currentPlayer + 1) % 2;
      return gs;
    }

    applyGameStatus(gs, p1, p2) {
      // Check if the game is tied
      gs.gameOver = gs.board.every(cell => cell !== '');

      // Check if the game has been won
      for (const ws of winningSequences) {
        if (gs.board[ws[0]] !== '' && gs.board[ws[0]] === gs.board[ws[1]] && gs.board[ws[1]] === gs.board[ws[2]]) {
          gs.gameOver = true;
          gs.winnerId = gs.board[ws[0]] === p1.avatar ? p1.id : p2.id;
          break;
        }
      }
      return gs;
    }

    getPlayerDetails(playerId, p1, p2) {
      const name = [p1.name, p2.name][playerId];
      const avatar = [p1.avatar, p2.avatar][playerId];
      return `${name} playing as ${avatar}`;
    }
  };
});
