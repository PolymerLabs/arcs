/**
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

'use strict';

defineParticle(({DomParticle, log}) => {

  return class extends DomParticle {
    get template() {
      return '<slot></slot>';
    }
    service(...args) {
      this.capabilities.serviceRequest(this, ...args);
    }
    update({}, state) {
      if (!state.requestedService) {
        state.requestedService = true;
        this.service({name: 'test'}, ({channel}) => this.setState({channel}));
      }
      if (state.channel) {
        log('service channel', state.channel);
        this.service({channel: state.channel, name: 'classify'}, ({response}) => log(response));
      }
    }
  };

});
