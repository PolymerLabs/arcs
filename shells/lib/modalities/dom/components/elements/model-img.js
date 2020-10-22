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

const log = Xen.logFactory('ModelImg', 'blue');

/*
 Has two modes:
  1. add an <img> child and set `src`
  or
  2. set `url` (to use background style)

 Probably should be two elements instead.
*/

class ModelImg extends Xen.Base {
  static get observedAttributes() {
    return ['src', 'url', 'fadems'];
  }
  get img() {
    return this.firstElementChild;
  }
  _update({src, url, fadems}, state) {
    const fade = fadems || 150;
    if (src && state.src !== src) {
      state.src = src;
      this.loadSrc(this.img, src, fade);
    }
    if (url && state.url !== url) {
      //log(url);
      state.url = url;
      this.loadBg(this.img, url, fade);
    }
  }
  loadBg(img, src, fade) {
    //log('loadBg', src);
    const image = new Image();
    image.src = src;
    image.onload = () => {
      image.onload = null;
      this.style.cssText = `background-image: url(${src});`;
    };
  }
  loadSrc(img, src, fade) {
    //log('loadSrc', src);
    img.style.cssText = 'opacity: 0;';
    img.src = '';
    img.src = src;
    img.onload = () => {
      img.onload = null;
      img.style.cssText = `transition: opacity ${fade}ms ease-in; opacity: 1;`;
    };
  }
}

customElements.define('model-img', ModelImg);
