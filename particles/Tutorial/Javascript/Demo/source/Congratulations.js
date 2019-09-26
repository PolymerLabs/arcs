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

const template = html`<span>{{startmsg}}</span> Please hit refresh to start a new game.`;

  return class extends DomParticle {
    get template() {
      return template;
    }

    shouldRender({gameState, players}) {
      // Here we check that the game is over.
      return players && gameState && gameState.gameOver;
    }

    render({gameState, players}) {
      if (gameState.winnerAvatar !== null) {
        let winner = '';
        // Find the winner's name based on the avatar.
        for (let i = 0; i < players.length; i++) {
          if (players[i].avatar == gameState.winnerAvatar) {
            winner = players[i].name;
          }
        }
        return {startmsg: `Congratulations ${winner}, you won!`};
      } 
      // If there is no winner, we know it was a tie.
      return {startmsg: `It's a tie!`};
    }
    
  };
});
