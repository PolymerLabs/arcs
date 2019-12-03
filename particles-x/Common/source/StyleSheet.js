
/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
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
  :host {
    /* --slug-color: black; */
    --input-color: #222222;
    /* --input-bg: navy; */
  }
</style>
<div slotid="container"></div>

  `;

  return class extends SimpleParticle {
    get template() {
      return template;
    }
    render(props, state) {
      return state;
    }
  };

});
