/*
 * Copyright (c) 2019 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
 */

import {Xen} from '../../xen/xen-async.js';
import 'https://unpkg.com/ml5@0.2.3/dist/ml5.min.js';

//const log = Xen.logFactory('ImageClassifier', 'blue');

class ImageHelper extends Xen.Async {
  static get observedAttributes() {
    return ['src'];
  }
  update({src}, state) {
    if (state.src !== src) {
      state.src = src;
      this.updateSrc(src);
    }
  }
  async updateSrc(src) {
    const img = await this.getImage(src);
    const bytes = await this.getBytes(img);
    this.state = {img, bytes};
    this.value = bytes;
    this.fire('change');
  }
  async getImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.src = src;
    });
  }
  async getBytes(img) {
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    const dataUrl = canvas.toDataURL('image/png');
    //console.warn(dataUrl);
    //alert('from getbase64 function'+dataUrl );
    return dataUrl;
  }
}

customElements.define('image-helper', ImageHelper);
