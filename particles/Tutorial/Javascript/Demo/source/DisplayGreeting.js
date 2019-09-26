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
<ul>{{players}}</ul>
<template greeting>
  <li>Hello, <span>{{name}}</span>! Today you are playing as <span>{{avatar}}</li>
</template>`;

  return class extends DomParticle {
    get template() {
      return template;
    }

    shouldRender({players}) {
      // Here we check that the players is defined.
      return players;
    }

    render({players}) {
      return {
        // This will fill in the "players" placeholder in the template above. We construct an object with special properties named "$template"
        // and "models", which defines how to render each item in the list.
        players: {
          // $template gives the name of the template to use to render each element.
          $template: 'greeting',
          // Each model in this list will get passed into the person template. The template can access the properties in this model (here, name
          // and age) via placeholders.
          models: players.map(player => ({name: player.name, avatar: player.avatar})),
        }
      };
    }
    
  };
});
