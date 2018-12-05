/*
@license
Copyright (c) 2018 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
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
