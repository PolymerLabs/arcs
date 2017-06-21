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
    <!--
    <a-assets>
      <a-asset-item id="pot-obj" src="assets/3d-model.obj"></a-asset-item>
    </a-assets>
    -->
    <a-obj-model src="assets/3d-model.obj" position="0 1 -2" scale="0.002 0.002 0.002"></a-obj-model>
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