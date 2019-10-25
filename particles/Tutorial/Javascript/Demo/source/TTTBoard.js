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

  .valid-butt {
    border: 1px outset blue;
    height: 50px;
    width: 50px;
    cursor: pointer;
    background-color: lightblue;
  }

  .valid-butt:hover {
    background-color: blue;
    color: white;
  }
</style>
<div class="grid-container">{{buttons}}</div>
<template button>
  <button class="valid-butt" type="button" on-click="onClick" value="{{value}}" \>
    <span>{{cell}}</span>
  </button>
</template>
<div hidden="{{hideReset}}"> 
  Please hit reset to start a new game.<button on-click="reset">Reset</button>
</div>
`;

  return class extends SimpleParticle {

    get template() {
      return template;
    }

    shouldRender({gameState}) {
      return gameState;
    }

    render({gameState}) {
      const boardArr = JSON.parse(gameState.board);
      return {
        hideReset: !gameState.gameOver,
        buttons: {
          $template: 'button',
          models: boardArr.map((cell, index) => ({cell, value: index}))
        }
      };
    }

    reset() {
      this.add('events', {type: 'reset'});
    }

    onClick(e) {
      this.add(`events`, {type: 'click', move: Number(e.data.value), time: new Date().getTime()});
    }
  };
});
