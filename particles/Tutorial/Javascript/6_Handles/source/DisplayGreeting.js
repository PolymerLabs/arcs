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

/* global defineParticle */

defineParticle(({DomParticle, html}) => {   

const template = html`Hello, <span>{{name}}</span>!`;

  return class extends DomParticle {
    get template() {
      return template;
    }

    shouldRender({person}) {
      // Here we check that the person is defined.
      return person;
    }

    render({person}) {
      return {
        name: person.name,
      };
    }
    
  };
});
