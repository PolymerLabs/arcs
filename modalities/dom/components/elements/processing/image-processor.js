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

const template = Xen.html`
  <div style="padding: 16px;">
    <div>Status: <b>{{status}}</b></div>
    <div>Label: <b>{{label}}</b></div>
    <div>Confidence: <span>{{probability}}</span></div>
  </div>
`;

class ImageProcessor extends Xen.Async {
  static get observedAttributes() {
    return ['url'];
  }
  get template() {
    return template;
  }
  update({url}, state) {
    if (!state.status) {
      state.status = 'idle';
    }
    if (state.url !== url) {
      state.url = url;
      this.updateUrl(url);
    }
    if (state.img) {
      const img = state.img;
      state.img = null;
      this.classify(img);
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
  async classify(image) {
   this.state = {status: 'classifying...'};
    console.log('classifying...');
    // Initialize the Image Classifier method with MobileNet
    const classifier = await window.ml5.imageClassifier('MobileNet');
    const results = await classifier.classify(image);
    const result = results.shift();
    console.log('classifying done.');
    this.state = {
      label: result.label,
      probability: result.confidence.toFixed(4),
      status: 'done'
    };
  }
}

customElements.define('image-processor', ImageProcessor);
