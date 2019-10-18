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

  return class extends SimpleParticle {

    get template() {
      return html`
<span>It is your turn <span>{{name}}</span>, playing as <span>{{avatar}}</span>.
<div slotid="gameSlot"></div>
<div hidden="{{hideCongrats}}">Congratulations <span>{{winnerName}}</span>!</div>`;
    }

    shouldRender({gameState, playerOne, playerTwo}) {
      return gameState && playerOne.id == 0 && playerTwo.id;
    }

    update({gameState, playerOne, playerTwo, playerOneMove, playerTwoMove, event}) {

      if (playerOne.id != 0) {
        this.set('playerOne', {name: playerOne.name, avatar: playerOne.avatar, id: 0});
      }

      if (!playerTwo.id) {
        this.set('playerTwo', {name: playerTwo.name, avatar: playerTwo.avatar, id: 1});
      }

      if (!gameState) {
        this.newGame();
      }

      if (gameState && gameState.gameOver && event && event.type == 'reset') {
        this.newGame();
      }

      if (gameState && !gameState.gameOver) {
        const mv = [playerOneMove.move, playerTwoMove.move][gameState.currentPlayer];
        const avatar = [playerOne.avatar, playerTwo.avatar][gameState.currentPlayer];
        let gs = this.extractGameState(gameState);
        if (this.isMoveValid(gs, mv)) {
          gs = this.applyMove(gs, mv, avatar);
          gs = this.applyGameStatus(gs, playerOne, playerTwo);
          this.set('gameState', gs);
        }
      }
    }

    render({gameState, playerOne, playerTwo}) {
      return {
        hideCongrats: !gameState.gameOver,
        name: [playerOne.name, playerTwo.name][gameState.currentPlayer],
        avatar: [playerOne.avatar, playerTwo.avatar][gameState.currentPlayer],
        winnerName: this.getWinner(gameState, playerOne, playerTwo)
      };
    }

    newGame() {
      this.set('gameState', {
        board: JSON.stringify(['', '', '', '', '', '', '', '', '']),
        gameOver: false,
        winnerId: null,
        currentPlayer: Math.floor(Math.random() * 2)
      });
      this.set('playerOneMove', {});
      this.set('playerTwoMove', {});
      this.set('event', {});
    }

    isMoveValid(gs, mv) {
      return mv > -1 && mv < 10 && JSON.parse(gs.board)[mv] == '';
    }

    applyMove(gs, mv, avatar) {
      const arr = JSON.parse(gs.board);
      arr[mv] = avatar;
      gs.board = JSON.stringify(arr);
      gs.currentPlayer = (gs.currentPlayer + 1) % 2;

      return gs;
    }

    applyGameStatus(gs, p1, p2) {
      // Check if the game is tied
      gs.gameOver = true;
      const board = JSON.parse(gs.board);
      for (const cell of board) {
        if (cell == '') {
          gs.gameOver = false;
          break;
        }
      }

      // Check if the game has been won
      for (const ws of winningSequences) {
        if (board[ws[0]] !== '' && board[ws[0]] === board[ws[1]] && board[ws[1]] == board[ws[2]]) {
          gs.gameOver = true;
          if (board[ws[0]] == p1.avatar) {
            gs.winnerId = p1.id;
          } else {
            gs.winnerId = p2.id;
          }
          break;
        }
      }
      return gs;
    }

    extractGameState(gs) {
      return {
        board: gs.board,
        gameOver: gs.gameOver,
        winnerId: gs.winnerId,
        currentPlayer: gs.currentPlayer,
      };
    }

    getWinner(gs, p1, p2) {
      if (gs.winnerId !== null) {
        return [p1.name, p2.name][gs.winnerId];
      } else {
        return `it's a tie`;
      }
    }
  };
});
