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

    update({gameState}, {}) {
      if (gameState) {
        
        const emptyCells = [];
        const board = gameState.board.split(`,`);
        for (let i = 0; i < board.length - 1; i++) {
          if (board[i] == ``) {
            emptyCells.push((i + 1).toString());
          }
        }
        console.log(`computer thinks board is: `, gameState.board);
        console.log(`computer thinks empty cells are:`, emptyCells);
        const selection = Math.floor(Math.random() * emptyCells.length);
        console.log(`setting computer move to `, selection);
        this.updateSingleton('computerMove', {move: emptyCells[selection]});
      }
    }
  };
});