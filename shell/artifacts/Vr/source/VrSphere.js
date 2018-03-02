// @license
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

"use strict";

defineParticle(({DomParticle}) => {

  let template = `
    <a-entity position="0 2 -5">
      <a-sphere radius="1" color="red"></a-sphere>
      <a-entity slotid="action" position="0 0.5 0"></a-entity>
    </a-entity>
  `.trim();

  return class extends DomParticle {
    get template() {
      return template;
    }
    _render(props, state) {
      return {};
    }
  };

});