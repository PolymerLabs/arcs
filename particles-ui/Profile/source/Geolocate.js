/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

 /* global defineParticle */

defineParticle(({UiParticle, html}) => {

  const template = html`

  <style>
    :host {
      display: none;
    }
  </style>
  
  <geo-location on-coords="onCoords"></geo-location>

  `;

  return class extends UiParticle {
    get template() {
      return template;
    }
    onCoords(e) {
      this.updateSingleton('location', e.data.value);
    }
  };

});
