/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
defineParticle(({DomParticle, html}) => {
  return class extends DomParticle {
    get template() {
      // The parent particle needs to provide a div with slotid "mySlot". This is where the child particle will be rendered.
      return html`
        <b>Hello:</b>
        <div slotid="mySlot"></div>
      `;
    }
  };
});
