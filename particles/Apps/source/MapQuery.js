// @license
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

'use strict';

defineParticle(({DomParticle, html, log}) => {
  return class extends DomParticle {
    get template() {
      return html`<div slotid="pipeContent"></div>`;
    }
    update({entities, pipe}, state) {
      if (/*entities &&*/ pipe) {
        //const text = `there are ${entities.length} known entities.`;
        const text = `there is AInfo`;
        this.updateVariable('text', {text});
        //this.setParticleDescription(text);
      }
    }
  };

});
