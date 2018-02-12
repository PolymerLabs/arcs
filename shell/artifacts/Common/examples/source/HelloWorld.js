// @license
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

"use strict";

defineParticle(({DomParticle, resolver, html, log}) => {

  let host = `hello-world`;

  const template = html`

<style>
  [${host}] {
    padding: 16px;
    font-size: 2em;
  }
  [${host}] button {
  }
</style>

<div ${host}>
  <p>Hello World</p>
  <button on-click="onClose">Ok</button>
</div>

    `.trim();

  return class extends DomParticle {
    get template() {
      return template;
    }
    onClose() {
      this.closeDialog();
    }
    closeDialog() {
      const handle = this._views.get('uiState');
      handle.set(new (handle.entityClass)({open: false}));
    }
  };
});