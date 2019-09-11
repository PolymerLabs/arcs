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
    .column {
      float: left;
      padding: 10px;
    }

    .row:after {
      clear: both;
    }
  </style>
  <div class="row">
    <div class = "col">
      <div slotid="cellSlot1"></div><div slotid="cellSlot2"></div><div slotid="cellSlot3"></div>
    </div>
  </div>
`;

  return class extends DomParticle {
    get template() {
      return template;
    }

    render({gameState, cellState1, cellState2, cellState3}, {initialised}) {
      if (!initialised) {
        this.setState({initialised: true});
        this.updateSingleton('gameState', {gameOver: false, moves: 0});
      }
      if (gameState && cellState1 && cellState2 && cellState3) {
        const mvs = cellState1.moves + cellState2.moves + cellState3.moves;
        this.updateSingleton('gameState', {gameOver: false, moves: mvs});
      }
      return {};
    }
    
  };
});
