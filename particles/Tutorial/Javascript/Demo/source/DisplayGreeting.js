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
  Hello, <span>{{name}}</span>! Today you are playing as <span>{{avatar}}</span> against the computer. To begin, please click on a cell to make your first move.
`;

  return class extends SimpleParticle {
    get template() {
      return template;
    }

    shouldRender({player}) {
      return player;
    }

    render({player}) {
      return {name: player.name, avatar: player.avatar};
    }

  };
});
