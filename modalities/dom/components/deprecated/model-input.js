/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import Xen from '../xen/xen.js';

class ModelInput extends Xen.Base {
  static get observedAttributes() {
    return ['focus'];
  }
  _wouldChangeProps() {
    return true;
  }
  _render({focus}) {
    const input = this.querySelector('input') || this.querySelector('textarea');
    if (input && focus) {
      input.focus();
    }
  }
}
customElements.define('model-input', ModelInput);
