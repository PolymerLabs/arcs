/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

defineParticle(({UiParticle, resolver, html}) => {

  const host = `address-form`;

  const styles = html`
<style>
  [${host}] {
    padding: 16px;
  }
  [${host}] > cx-input {
    display: block;
    margin-bottom: 40px;
  }
</style>
  `;

  const template = html`

${styles}

<div ${host}>

  <cx-input>
    <input slot="input" id="nameInput">
    <label slot="label" for="nameInput">Name</label>
  </cx-input>
  <cx-input>
    <input slot="input" id="streetInput">
    <label slot="label" for="streetInput">Address</label>
  </cx-input>
  <cx-input>
    <input slot="input" id="cityInput">
    <label slot="label" for="cityInput">City</label>
  </cx-input>
  <cx-input>
    <input slot="input" id="stateInput">
    <label slot="label" for="stateInput">State</label>
  </cx-input>

</div>

  `.trim();

  return class extends UiParticle {
    get template() {
      return template;
    }
  };

});
