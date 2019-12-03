/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
defineParticle(({SimpleParticle, html}) => {
  return class extends SimpleParticle {
    get template() {
      // You can set placeholders in your template like so: {{name}}. The render function is where these placeholders are overridden.
      // NOTE: Each placeholder needs to be enclosed inside its own HTML element (here, a <span>).
      return html`<b>Hello, <span>{{name}}</span>!</b>`;
    }

    render() {
      // Returns a dictionary, mapping from placeholder name to value.
      return {name: 'Human'};
    }
  };
});
