// @license
// Copyright (c) 2018 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

defineParticle(({DomParticle, html}) => {

  const host = `bg-process`;

  const template = html`

<div ${host}>
  <span>Handling background processing...</span>
</div>

  `;

  return class extends DomParticle {
    get template() {
      return template;
    }
  };

});
