/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
'use strict';

let SlotContainer;

if (global.document) {
  SlotContainer = class extends HTMLElement {
    static subscribe(cb) {
      document.addEventListener('slot-container', e => {
        cb(e.details);
      });
    }
    connectedCallback() {
      document.dispatchEvent(
        new CustomEvent('slot-container', {
          detail: {
            kind: 'connected',
            name: this.getAttribute('name'),
            node: this
          }
        })
      );
    }
  };
  customElements.define('slot-container', SlotContainer);
} else {
  SlotContainer = { subscribe: () => null };
}

module.exports = SlotContainer;
