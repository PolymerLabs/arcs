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
  add an <img> child and set `src`
  set `url` (will use background style)

 Probably should be two elements instead.
*/

class ModelImg extends Xen.Base {
  static get observedAttributes() {
    return ['src', 'url', 'fadems'];
  }
  _update({src, url, fadems}, state) {
    const fade = fadems || 150;
    if (src && state.src !== src) {
      //log(src);
      state.src = src;
      const img = this.img;
      img.style.cssText = `transition: opacity ${fade}ms ease-in; opacity: 0;`;
      img.src = src;
      img.onload = e => this.onLoad(img, src);
    }
    if (url && state.url !== url) {
      //log(url);
      state.url = url;
      this.style.cssText = `transition: opacity ${fade}ms ease-in; opacity: 0;`;
      const image = Object.assign(new Image(), {src: url});
      image.onload = () => {
        this.style.cssText = `background-image: url(${url}); opacity: 1;`;
        this.onLoad(image, url);
      };
    }
  }
  get img() {
    return this.firstElementChild;
  }
  onLoad(img, url) {
    //log(`[${url}] loaded`);
    img.onload = null;
    img.style.opacity = 1;
  }
}

customElements.define('model-img', ModelImg);
