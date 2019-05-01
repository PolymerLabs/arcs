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

defineParticle(({Particle}) => {
 return class MoveApplier extends Particle {
   setHandles(handles) {
     this.handles = handles;
   }
   async onHandleUpdate(handle, update) {
     const board = await this.handles.get('board').get();
     const resultHandle = this.handles.get('result');

      const nextMove = await handle.get();
     if (handle.name === 'nextMove') {
       // Valid player
       if (nextMove.player !== 1 || nextMove.player !== 2) {
         resultHandle.set(new resultHandle.entityClass(
             `Invalid player ID: ${nextMove.player}`));
         return;
       }
       // Correct player
       const state = await this.handles.get('state').get();
       if (nextMove.player !== state.player) {
         resultHandle.set(new resultHandle.entityClass(`Incorrect player ID: ${
             nextMove.player} expected ${state.player}`));
         return;
       }
       // Range checks
       if (nextMove.x < 0 || nextMove.x > 2 || nextMove.y < 0 ||
           nextMove.y > 2) {
         resultHandle.set(new resultHandle.entityClass(
             `Invalid location: ${nextMove.x}, ${nextMove.y}`));
         return;
       }
       // Empty board location
       const boardMatrix = [
         [board.p00, board.p01, board.p02],
         [board.p10, board.p11, board.p12],
         [board.p20, board.p21, board.p22]
       ];
       if (boardMatrix[nextMove.y][nextMove.x] == 0) {
         resultHandle.set(new resultHandle.entityClass(
             `Occupied location: ${nextMove.x}, ${nextMove.y}`));
         return;
       }
     }
     boardMatrix[nextMove.y][nextMove.x] = state.player;
     resultHandle.set(new resultHandle.entityClass({
       p00: boardMatrix[0][0], p01: boardMatrix[1][0], p02: boardMatrix[2][0],
       p10: boardMatrix[0][1], p11: boardMatrix[1][1], p12: boardMatrix[2][1],
       p20: boardMatrix[0][2], p21: boardMatrix[1][2], p22: boardMatrix[2][2]
     }));
   }
 };
});
