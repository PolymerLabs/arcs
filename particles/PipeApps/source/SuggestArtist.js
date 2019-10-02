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

defineParticle(({SimpleParticle}) => {

  return class extends SimpleParticle {
    get template() {
      return `<span>{{json}}</span>`;
    }
    render({artist}) {
      if (artist) {
        const json = JSON.stringify(artist);
        this.updateSingleton('suggestion', {json});
        return {json};
      }
    }
  };

});
