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

defineParticle(({SimpleParticle, log}) => {

  return class extends SimpleParticle {
    get template() {
      return `<span></span>`;
    }
    update({pipe}) {
      if (this.pipeIsValid(pipe)) {
        this.set('find', {
          name: pipe.name
        });
      }
    }
    pipeIsValid(pipe) {
      return (pipe && pipe.type === 'artist');
    }
  };

});
