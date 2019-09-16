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

const template = html`Congrats to <span>{{name}}</span>, you won! Please hit refresh to start a new game.`;

  return class extends DomParticle {
    get template() {
      return template;
    }

    shouldRender({gameState}) {
      // Here we check that the person is defined.
      return person && gameState && gameState.gameOver;
    }

    render({gameState}) {
      return {name: person.name};
    }
    
  };
});
