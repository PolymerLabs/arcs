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

  return class extends SimpleParticle {
    get template() {
      return html`
      <div slotid="playerSlot"></div>
      <div slotid="greetingSlot"></div>
      <div slotid="cellSlot"></div>
      <div slotid="congratulationsSlot"></div>
    `;
    }
    
  };
});
