/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

'use strict';

defineParticle(({DomParticle, log, html, resolver}) => {

  const template = html`

<div style="padding: 16px;">
  <div>You know what a <i>haza<i> is Frank?!</div>
  <div>(Service): <span>{{response}}</span></div>
</div>

  `;

  return class extends DomParticle {
    get template() {
      return template;
    }
    update({}, state) {
      if (!state.run) {
        state.run = true;
        this.test();
      }
    }
    async test() {
      const response = await this.service({call: 'test.classify'});
      this.setState({response});
    }
    render({}, {response}) {
      return {
        response: response ? response.data : '<working>'
      };
    }
  };

});
