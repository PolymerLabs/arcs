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

const log = Xen.logFactory('ModelImg', 'blue');

class ModelImg extends Xen.Base {
  static get observedAttributes() {
    return ['src'];
  }
  _update({src}, state) {
    const img = this.img;
    if (img && !state.listener) {
      state.listener = img.addEventListener('load', e => this.onLoad(img, e));
    }
    if (img && src) {
      img.style.cssText = `transition: opacity 300ms ease-in; opacity: 0;`;
      img.src = src;
    }
  }
  get img() {
    return this.firstElementChild;
  }
  onLoad(img, e) {
    img.style.opacity = 1;
  }
}

customElements.define('model-img', ModelImg);
