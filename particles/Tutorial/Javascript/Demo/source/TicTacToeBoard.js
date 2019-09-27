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

const template = html`
  <style>
    .grid-container {
      display: grid;
      grid-template-columns: 50px 50px 50px;
      grid-column-gap: 0px;
    }

    .butt {
      border: 1px outset blue;
      background-color: lightBlue;
      height: 50px;
      width: 50px;
      cursor: pointer;
    }

    .butt:hover {
      background-color: blue;
      color: white;
    }
  </style>
  <div class="grid-container">
      <div class="grid-container">{{buttons}}</div>
  </div>
  <template button>
    <button class="butt" type="button" on-click="onClick" value={{value}}>
      <span>{{spot}}</span>
    </button>
  </template>
`;

  return class extends SimpleParticle {
    get template() {
      return template;
    }

    shouldRender({gameState}) {
      return gameState && gameState.gameStarted;
    }

    render({gameState}) {
      if (gameState) {
        const arr = gameState.board.split(`,`);
        // Return the values that should be filled into the board
        return {
          buttons: {
            $template: 'button',
            models: arr.map((spot, index) => ({spot: spot, value: index +1}))
          },
        };
      }
      // If the gameState does not exist yet, the game has not been 
      // initialised, so return nothing.
      return {};
    }
    
    // The board acts as the human mover. When the human clicks on the 
    // board, the move should update accordingly.
    onClick(e) {
      this.updateSingleton(`humanMove`, {move: e.data.value});
    }
    
  };
});
