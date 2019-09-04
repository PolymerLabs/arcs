/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

// The JavaScript code for the Hello World particle. This is mostly boilerplate for defining a new particle using the UiParticle class, which
// is a subclass of Particle that provides convenient methods for rendering to the DOM. (There are other more basic ways to render to the DOM,
// but UiParticle provides a nice abstraction for it, similar to React).

defineParticle(({UiParticle, html}) => {
  return class extends UiParticle {
    // Getter function which returns static HTML to display. In later tutorials we'll see how to use the templating functionality this provides.
    get template() {
      // You can use the html helper to hint your syntax-highlighting editor that string contains HTML code
      return html`<b>Hello, world!</b>`;
    }
  };
});
