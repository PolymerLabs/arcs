/**
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

'use strict';

/* global defineParticle */

defineParticle(({DomParticle, html, log}) => {

  const template = html`
    <image-processor url="{{url}}"></image-processor>
  `;

  return class extends DomParticle {
    get template() {
      return template;
    }
    render({image}, state) {
      if (image) {
        return {url: image.url};
      }
    }
  };

});
