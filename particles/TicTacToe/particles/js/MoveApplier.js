/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

'use strict';

function boardToMatrix(board) {
  return [
    [board.p00, board.p01, board.p02],
    [board.p10, board.p11, board.p12],
    [board.p20, board.p21, board.p22]
  ];
}


function matrixToBoard(matrix) {
  return {
    p00: matrix[0][0],
    p01: matrix[1][0],
    p02: matrix[2][0],
    p10: matrix[0][1],
    p11: matrix[1][1],
    p12: matrix[2][1],
    p20: matrix[0][2],
    p21: matrix[1][2],
    p22: matrix[2][2]
  };
}


defineParticle(({Particle}) => {
  return class MoveApplier extends Particle {
    setHandles(handles) {
      this.handles = handles;
    }

    async onHandleSync(handle, model) {
      this.change(handle);
    }

    async onHandleUpdate(handle) {
      this.change(handle);
    }

    checkValid(board, nextMove, state) {
      if (!nextMove) {
        return `Invalid nextMove ${nextMove}`;
      }

      if (!board) {
        return `Invalid board ${board}`;
      }

      if (!state) {
        return `Invalid state ${state}`;
      }

      // Valid player
      if (nextMove.player !== 1 && nextMove.player !== 2) {
        return `Invalid player ID: ${nextMove.player}`;
      }
      // Correct player
      if ((nextMove.player === 1 && state.state !== 0) ||
          (nextMove.player === 2 && state.state !== 1)) {
        return `Incorrect player ID: ${nextMove.player} with state ${
            state.state}`;
      }
      // Range checks
      if (nextMove.x < 0 || nextMove.x > 2 || nextMove.y < 0 ||
          nextMove.y > 2) {
        return `Invalid location: ${nextMove.x}, ${nextMove.y}`;
      }

      const boardMatrix = boardToMatrix(board);
      if (boardMatrix[nextMove.y][nextMove.x] !== 0) {
        return `Occupied location: x:${nextMove.x}, y:${nextMove.y} by:${
            boardMatrix[nextMove.y][nextMove.x]}`;
      }
    }

    async change(handle) {
      if (handle.name === 'nextMove') {
        const board = await this.handles.get('board').get();
        const nextMove = await handle.get();
        const state = await this.handles.get('state').get();

        const messageResult = this.checkValid(board, nextMove, state);
        if (messageResult) {
          const messageResultHandle = this.handles.get('messageResult');
          messageResultHandle.set(
              new messageResultHandle.entityClass({msg: messageResult}));
          return;
        }

        const boardMatrix = boardToMatrix(board);
        boardMatrix[nextMove.y][nextMove.x] = nextMove.player;
        const boardResultHandle = this.handles.get('boardResult');
        boardResultHandle.set(
            new boardResultHandle.entityClass(matrixToBoard(boardMatrix)));
      }
    }
  };
});
