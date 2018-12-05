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

class ServiceWorker extends Xen.Base {
  static get observedAttributes() {
    return ['href', 'scope', 'disabled'];
  }
  _update({href, scope, disabled}, state) {
    if (!state.registered && !disabled && href) {
      state.registered = true;
      this.register(href, scope || '.');
    }
  }
  register(href, scope) {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register(href, {scope: scope});
    }
  }
}
customElements.define('service-worker', ServiceWorker);

