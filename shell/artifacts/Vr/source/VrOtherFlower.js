// @license
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

"use strict";

defineParticle(({DomParticle}) => {

  return class extends DomParticle {
    get template() {
      return `
<a-obj-model src="assets/plants1.obj" mtl="assets/plants1.mtl" position="0.52 0.18 0.175" rotation="-3 -22 -10" scale="0.002 0.002 0.002"></a-obj-model>
      `.trim();
    }
  };

});