// @license
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

defineParticle(({DomParticle, resolver, html}) => {

  const host = `vertical-layout`;

  const template = html`

<div ${host} style="padding: 8px;">
  <style>
    [${host}] {
      max-width: 400px;
      margin: 0 auto;
    }
    [${host}] > [main] {
      border: 1px solid blue;
      background-color: white;
    }
  </style>

  <div header slotid="header">HEADER</div>
  <div main slotid="main">MAIN</div>
  <div footer slotid="footer">FOOTER</div>
</div>
  `;

  return class extends DomParticle {
    get template() {
      return template;
    }
    render() {
      return {};
    }
  };
});
