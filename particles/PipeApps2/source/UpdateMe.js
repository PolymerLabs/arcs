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
    get template() {
      return `<span>{{json}}<span>`;
    }
    render(props, state) {
      if (state.count === undefined) {
        state.count = 10;
      }
      if (!state.async && state.count--) {
        // TODO(lindner): Convert to use Random service
        const dur = Math.floor(Math.random()*10);
        log(`will update in ${dur}s`);
        state.async = setTimeout(() => {
          const json = JSON.stringify(`The time is now ${new Date().toLocaleTimeString()}`);
          this.updateSingleton('output', {json});
          log(`set output to`, json);
          this.setState({async: null, json});
        }, dur*1000) + 1;
      }
      return state;
    }
  };

});
