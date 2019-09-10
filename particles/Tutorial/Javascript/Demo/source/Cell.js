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
  <style>
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
  <button class="butt" type="button" on-click="onClick">
  <div slotid="avatarSlot"></div>
  </button>
  `;

  return class extends DomParticle {

    get template() {
      return template;
    }

    render() {
      return {};
    }

    onClick(e) {
      console.log('This button was clicked!\n', e);
    }
  };
});