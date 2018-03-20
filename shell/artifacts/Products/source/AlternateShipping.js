/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

'use strict';

defineParticle(({DomParticle}) => {

  let template = `
    Alternatives that will arrive in time: <span>{{alternatives}}</span>
    `.trim();

  return class extends DomParticle {
    get template() {
      return template;
    }
    shouldRender(props) {
      return !!props && !!props.product;
    }
    render(props) {
      let alternatives = ['Target', 'Cole Hardware'].join(', ');
      return {
        alternatives
      };
    }
  };
});
