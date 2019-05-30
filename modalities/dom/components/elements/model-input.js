/**
 * @license
 * Copyright (c) 2018 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import Xen from '../xen/xen.js';

const log = Xen.logFactory('ModelInput', 'blue');

class ModelInput extends Xen.Base {
  static get observedAttributes() {
    return ['focus'];
  }
  _update({focus}, state) {
    const input = this.input;
    if (input && focus) {
      input.focus();
    }
    if (input && !state.listener) {
      state.listener = input.addEventListener('keydown', e => e.key === 'Escape' && this._fire('cancel'));
    }
  }
  get input() {
    return this.firstElementChild;
  }
}

customElements.define('model-input', ModelInput);
