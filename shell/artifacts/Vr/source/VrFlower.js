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
    constructor() {
      super();
      this.relevance = 9;
    }
    get template() {
      return `
<a-obj-model src="assets/plants.obj" mtl="assets/plants.mtl" position="-0.36 0.5 0.04" rotation="-30 30 0" scale="0.002 0.002 0.002"></a-obj-model>
      `.trim();
    }
  };

});