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

defineParticle(({DomParticle, html, log}) => {

  return class extends DomParticle {
    // for testing under DOM modality
    get template() {
      return `<span>{{json}}<span>`;
    }
    render(props, state) {
      const json = JSON.stringify({
        modality: 'notification',
        content: 'Now is the time for all good men to come to the aid of their party.'}
      );
      if (state.json !== json) {
        state.json = json;
        this.updateSingleton('output', {json});
      }
      return state;
    }
  };

});
