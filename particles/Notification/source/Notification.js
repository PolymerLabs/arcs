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

defineParticle(({DomParticle}) => {

  return class extends DomParticle {
    renderModel(props, state) {
      return {
        modality: 'notification',
        text: `Don't forget dinner reservations.`
      };
    }
    // simulate slot rendering (temporary)
    render(props, state) {
      const content = this.renderModel(props, state);
      const json = JSON.stringify(content);
      if (json !== state.json) {
        state.json = json;
        this.updateSingleton('output', {json: JSON.stringify(content)});
      }
    }
  };

});
