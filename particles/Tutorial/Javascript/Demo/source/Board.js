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

defineParticle(({DomParticle, html}) => {   

const template = html`
  <style>
    .grid-container {
      display: grid;
      grid-template-columns: 50px 50px 50px;
      grid-column-gap: 0px;
    }

    .row {
      content: "";
      display: table;
      clear: both;
      display: inline-flex;
    }

    .butt {
      border: 1px outset blue;
      background-color: lightBlue;
      height:50px;
      width:50px;
      cursor:pointer;
    }

    .butt:hover {
      background-color: blue;
      color:white;
    }
  </style>
  <div class="grid-container">
      <button class="butt" type="button" on-click="onClick" value=1>
        <span>{{spot1}}</span>
      </button>
      <button class="butt" type="button" on-click="onClick" value=2>
        <span>{{spot2}}</span>
      </button>
      <button class="butt" type="button" on-click="onClick" value=3>
        <span>{{spot3}}</span>
      </button>
      <button class="butt" type="button" on-click="onClick" value=4>
        <span>{{spot4}}</span>
      </button>
      <button class="butt" type="button" on-click="onClick" value=5>
        <span>{{spot5}}</span>
      </button>
      <button class="butt" type="button" on-click="onClick" value=6>
        <span>{{spot6}}</span>
      </button>
      <button class="butt" type="button" on-click="onClick" value=7>
        <span>{{spot7}}</span>
      </button>
      <button class="butt" type="button" on-click="onClick" value=8>
        <span>{{spot8}}</span>
      </button>
      <button class="butt" type="button" on-click="onClick" value=9>
        <span>{{spot9}}</span>
      </button>
  </div>
`;

  return class extends DomParticle {
    get template() {
      return template;
    }

    render({gameState}, {initialised}) {
      if (!initialised) {
        this.setState({initialised: true});
        //this.updateSingleton('gameState', {gameOver: false, moves: 0, board: `         `});
      }
      console.log(`gameState`, gameState);
      if (gameState) {
        
        const arr = gameState.board.split(`,`);
        return {
          spot1: arr[0],
          spot2: arr[1],
          spot3: arr[2],
          spot4: arr[3],
          spot5: arr[4],
          spot6: arr[5],
          spot7: arr[6],
          spot8: arr[7],
          spot9: arr[8],
        };
      }
      // if (gameState && cellState1 && cellState2 && cellState3 &&
      //                 cellState4 && cellState5 && cellState6 &&
      //                 cellState7 && cellState8 && cellState9) {
      //   const mvs = cellState1.moves + cellState2.moves + cellState3.moves +
      //               cellState4.moves + cellState5.moves + cellState6.moves +
      //               cellState7.moves + cellState8.moves + cellState9.moves;
        
                  
      //   // X Y Y 
      //   // X Y Y
      //   // X Y Y
      //   if (this.checkIfWon(cellState1.winnerId, cellState2.winnerId, cellState3.winnerId)) {
      //     this.updateSingleton('gameState', {gameOver: true, moves: mvs, winnerId: cellState1.winnerId});
      //   }
      //   // Y X Y  
      //   // Y X Y 
      //   // Y X Y 
      //   else if (this.checkIfWon(cellState4.winnerId, cellState5.winnerId, cellState6.winnerId)) {
      //     this.updateSingleton('gameState', {gameOver: true, moves: mvs, winnerId: cellState4.winnerId});
      //   }
      //   // Y Y X   
      //   // Y Y X  
      //   // Y Y X  
      //   else if (this.checkIfWon(cellState7.winnerId, cellState8.winnerId, cellState9.winnerId)) {
      //     this.updateSingleton('gameState', {gameOver: true, moves: mvs, winnerId: cellState7.winnerId});
      //   }
      //   // X X X   
      //   // Y Y Y  
      //   // Y Y Y  
      //   else if (this.checkIfWon(cellState1.winnerId, cellState4.winnerId, cellState7.winnerId)) {
      //     this.updateSingleton('gameState', {gameOver: true, moves: mvs, winnerId: cellState1.winnerId});
      //   }
      //   // Y Y Y  
      //   // X X X   
      //   // Y Y Y  
      //   else if (this.checkIfWon(cellState2.winnerId, cellState5.winnerId, cellState8.winnerId)) {
      //     this.updateSingleton('gameState', {gameOver: true, moves: mvs, winnerId: cellState2.winnerId});
      //   }
      //   // Y Y Y     
      //   // Y Y Y 
      //   // X X X 
      //   else if (this.checkIfWon(cellState3.winnerId, cellState6.winnerId, cellState9.winnerId)) {
      //     this.updateSingleton('gameState', {gameOver: true, moves: mvs, winnerId: cellState3.winnerId});
      //   }
      //   // X Y Y     
      //   // Y X Y 
      //   // Y Y X 
      //   else if (this.checkIfWon(cellState1.winnerId, cellState5.winnerId, cellState9.winnerId)) {
      //     this.updateSingleton('gameState', {gameOver: true, moves: mvs, winnerId: cellState1.winnerId});
      //   }
      //   // Y Y X     
      //   // Y X Y 
      //   // X Y Y 
      //   else if (this.checkIfWon(cellState7.winnerId, cellState5.winnerId, cellState3.winnerId)) {
      //     this.updateSingleton('gameState', {gameOver: true, moves: mvs, winnerId: cellState3.winnerId});
      //   }
      //   else {
      //     this.updateSingleton('gameState', {gameOver: mvs == 9, moves: mvs});
      //   }
      // }
      return {};
    }

    checkIfWon(winner1, winner2, winner3) {
      if (winner1 != null) {
        if (winner1 == winner2) {
          if (winner2 == winner3) {
            return true;
          }
        }
      }
      return false;
    }

    onClick(e) {
      this.updateSingleton(`humanMove`, {move: e.data.value});
    }
    
  };
});
