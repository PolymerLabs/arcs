// @license
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

"use strict";

defineParticle(({DomParticle, resolver, html, log}) => {

  let host = `opener`;

  const template = html`
<style>
  [${host}] {
    height: 200vh;
    padding: 32px;
    border: 5px solid lightblue;
  }
</style>

<div ${host}>
  <button on-click="onClick">Open Dialog!</button>
</div>
    `.trim();

  return class extends DomParticle {
    get template() {
      return template;
    }
    onClick() {
      this.openDialog();
    }
    openDialog() {
      const handle = this._views.get('uiState');
      handle.set(new (handle.entityClass)({open: true}));
    }
  };
});