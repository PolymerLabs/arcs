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

const log = Xen.logFactory('ImageStyleTransfer', 'green');


const template = Xen.html`
`;


/**
 * Apply a style-transfer model to an input image.
 * Passes a new image source to the `on-results` event handler.
 */
class ImageStyleTransfer extends Xen.Async {
  static get observedAttributes() {
    return ['img-url', 'model-url'];
  }
  get template() {
    return template;
  }
  update({imgUrl, modelUrl}, state) {
    if (!state.status) {
      state.status = 'idle';
    }
    if (state.imgUrl !== imgUrl) {
      state.imgUrl = imgUrl;
      this.updateUrl(imgUrl);
    }
    if (state.modelUrl !== modelUrl) {
      state.modelUrl = modelUrl;
    }
    if (state.img) {
      const img = state.img;
      state.img = null;
      this.applyTransfer(img, modelUrl);
    }
  }
  async updateUrl(url) {
    const img = await this.getImage(url);
    this.state = {img};
  }
  async getImage(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.src = url;
    });
  }
  render(props, state) {
    return state;
  }
  async applyTransfer(baseImage, styleModel) {
    log('Loading style transfer model...');
    const styler = await window.ml5.styleTransfer(styleModel);
    log('Applying style transfer...');
    styler.transfer(baseImage, (err, result) => {
      if (err) {
        return;
      }
      this.value = {
        src: result.src,
      };
      this.fire('results');
    });
  }
}


customElements.define('image-styler', ImageStyleTransfer);
