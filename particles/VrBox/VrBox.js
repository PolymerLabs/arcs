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
    <a-box color="yellow" depth="0.5" height="0.5" width="0.5" position="0 0.75 0">
      <a-entity slotid="box-action" position="0 0.5 0"></a-entity>
    </a-box>
  `.trim();

  return class extends DomParticle {
    constructor() {
      super();
      this.relevance = 9;
    }
    get template() {
      return template;
    }
  };

});