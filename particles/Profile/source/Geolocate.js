/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

defineParticle(({DomParticle, html}) => {

  const host = `geolocate`;

  const template = html`

<div ${host}>
  <style>
    [${host}] {
      display: none;
    }
  </style>
   <geo-location on-coords="onCoords"></geo-location>
</div>

  `;

  return class extends DomParticle {
    get template() {
      return template;
    }
    onCoords(e) {
      this.updateVariable('location', e.data.value);
    }
  };

});
