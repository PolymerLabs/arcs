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

const template = html`<span>{{startmsg}}</span> Please hit reset to start a new game. <button on-click="onClick">Reset</button>`;

  return class extends SimpleParticle {
    get template() {
      return template;
    }

    shouldRender({gameState, playerOne, playerTwo}) {
      // Here we check that the game is over.
      return playerOne && playerTwo && gameState && gameState.gameOver;
    }

    render({gameState, playerOne, playerTwo}) {
      if (gameState.winnerAvatar !== null) {
        let winner = '';
        if (gameState.winnerAvatar == playerOne.avatar) {
          winner = playerOne.name;
        } else {
          winner = playerTwo.name;
        }
        return {startmsg: `Congratulations ${winner}, you won!`};
      } 
      // If there is no winner, we know it was a tie.
      return {startmsg: `It's a tie!`};
    }

    onClick() {
      this.updateSingleton('humanMove', {move: 'reset'});
    }
    
  };
});
