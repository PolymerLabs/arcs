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

   async onHandleSync(handle, model) {
      this.change(handle);
   }

   async onHandleUpdate(handle) {
      this.change(handle);
   }

  async change(handle) {
     const board = await this.handles.get('board').get();
     const boardResultHandle = this.handles.get('boardResult');
     const messageResultHandle = this.handles.get('messageResult');

      const nextMove = await handle.get();

     if (!nextMove) {
       messageResultHandle.set(new messageResultHandle.entityClass({msg: `Invalid nextMove ${nextMove}`}));
       return;
     }

     if (!board) {
       messageResultHandle.set(new messageResultHandle.entityClass({msg: `Invalid board ${board}`}));
       return;
     }

     if (handle.name === 'nextMove') {
       const state = await this.handles.get('state').get();
       if (!state) {
         messageResultHandle.set(new messageResultHandle.entityClass({msg: `Invalid state ${state}`}));
         return;
       }

       // Valid player
       if (nextMove.player !== 1 && nextMove.player !== 2) {
         messageResultHandle.set(
           new messageResultHandle.entityClass(
             {msg: `Invalid player ID: ${nextMove.player}`}));
         return;
       }
       // Correct player
       if ((nextMove.player === 1 && state.state !== 0)
         || (nextMove.player === 2 && state.state !== 1)) {
         messageResultHandle.set(new messageResultHandle.entityClass({msg: `Incorrect player ID: ${
             nextMove.player} with state ${state.state}`}));
         return;
       }
       // Range checks
       if (nextMove.x < 0 || nextMove.x > 2 || nextMove.y < 0 ||
           nextMove.y > 2) {
         messageResultHandle.set(new messageResultHandle.entityClass(
           {msg: `Invalid location: ${nextMove.x}, ${nextMove.y}`}));
         return;
       }
       // Empty board location
       const boardMatrix = [
         [board.p00, board.p01, board.p02],
         [board.p10, board.p11, board.p12],
         [board.p20, board.p21, board.p22]
       ];
       if (boardMatrix[nextMove.y][nextMove.x] !== 0) {
         messageResultHandle.set(new messageResultHandle.entityClass(
           {msg: `Occupied location: x:${nextMove.x}, y:${nextMove.y} by:${boardMatrix[nextMove.y][nextMove.x]}`}));
         return;
       }
       boardMatrix[nextMove.y][nextMove.x] = nextMove.player;
       boardResultHandle.set(new boardResultHandle.entityClass({
         p00: boardMatrix[0][0], p01: boardMatrix[1][0], p02: boardMatrix[2][0],
         p10: boardMatrix[0][1], p11: boardMatrix[1][1], p12: boardMatrix[2][1],
         p20: boardMatrix[0][2], p21: boardMatrix[1][2], p22: boardMatrix[2][2]
       }));
     }
   }
 };
});
