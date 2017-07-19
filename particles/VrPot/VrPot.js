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
    <a-entity position="-0.3 0 -1.3">
      <a-obj-model src="assets/3d-model.obj" scale="0.002 0.002 0.002"></a-obj-model>
      <a-entity slotid="soil"></a-entity>
      <a-entity slotid="soil2"></a-entity>
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