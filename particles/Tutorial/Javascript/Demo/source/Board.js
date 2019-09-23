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
      return {};
    }
    
    onClick(e) {
      this.updateSingleton(`humanMove`, {move: e.data.value});
    }
    
  };
});
