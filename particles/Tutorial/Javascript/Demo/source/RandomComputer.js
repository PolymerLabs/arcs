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

  const template = html`
<b>Player One</b><input value="{{name}}" placeholder="Enter your name" spellcheck="false" on-change="onNameInputChange">
  `;

  return class extends DomParticle {

    get template() {
      return template;
    }

    async update({currentPlayer, gameState, me,
                  cellState1, cellState2, cellState3,
                  cellState4, cellState5, cellState6,
                  cellState7, cellState8, cellState9}, {mvs}) {
      if (currentPlayer && gameState && me &&
        cellState1 && cellState2 && cellState3 &&
        cellState4 && cellState5 && cellState6 &&
        cellState7 && cellState8 && cellState9) {
        if (currentPlayer.id2 == me.id2) {
          if (!mvs) {
            this.setState({mvs: 0});
          }
          if (gameState.moves > mvs) {
            const cells = [];
            !cellState1.gameOver ? cells.push(`cellState1`) : cells;
            !cellState2.gameOver ? cells.push(`cellState2`) : cells;
            !cellState3.gameOver ? cells.push(`cellState3`) : cells;
            !cellState4.gameOver ? cells.push(`cellState4`) : cells;
            !cellState5.gameOver ? cells.push(`cellState5`) : cells;
            !cellState6.gameOver ? cells.push(`cellState6`) : cells;
            !cellState7.gameOver ? cells.push(`cellState7`) : cells;
            !cellState8.gameOver ? cells.push(`cellState8`) : cells;
            !cellState9.gameOver ? cells.push(`cellState9`) : cells;

            const selection = Math.floor(Math.random() * cells.length);
            this.updateSingleton(cells[selection], {gameOver: true, moves: 1, winnerId: me.id2});
            this.setState({mvs: gameState.moves + 1});
          }
          
        }
      }
    }
  };
});