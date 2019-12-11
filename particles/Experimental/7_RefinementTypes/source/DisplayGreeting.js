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


defineParticle(({SimpleParticle, html}) => {

  const template = html`Hello, <span>{{name1}}</span> <span>{{name2}}</span>!
  <div slotid="inputSlot1"></div>
  <div slotid="inputSlot2"></div>`;

  return class extends SimpleParticle {
    get template() {
      return template;
    }

    // We need the person handle within shouldRender, so it has to be passed in.
    shouldRender({person1, person2}) {
      // Here we check that the person is defined.
      return person1 || person2;
    }

    // Just like with shouldRender, we need access to person, so declare it needs to be passed in.
    render({person1, person2}) {
      // We want the name from person to be interpolated into the template.
      return {
        name1: person1.name,
        name2: person2.name
      };
    }
  };
});
