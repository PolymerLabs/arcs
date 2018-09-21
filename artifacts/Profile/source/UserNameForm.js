// @license
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

defineParticle(({DomParticle, html}) => {

  const host = `user-name-form`;

  const template = html`

<div ${host}>
  <style>
    [${host}] {
      padding: 16px;
    }
    [${host}] > cx-input {
      display: block;
      margin-bottom: 40px;
    }
  </style>
  <cx-input>
    <input slot="input" id="nameInput" on-change="onNameInputChange">
    <label slot="label" for="nameInput">User Name</label>
  </cx-input>
</div>

  `;

  return class extends DomParticle {
    get template() {
      return template;
    }
    onNameInputChange(e) {
      this.updateVariable('userName', {userName: e.data.value});
    }
  };

});
