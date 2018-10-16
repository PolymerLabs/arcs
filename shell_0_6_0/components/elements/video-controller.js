/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

class VideoControllerElement extends HTMLElement {
  connectedCallback() {
    this.video = document.querySelector('#' + this.getAttribute('video'));
  }
  set config(config) {
    if (config.mode == 'play') {
      this.video.currentTime = (config.position + (Date.now() - config.ts)) / 1000.0;
      this.video.play();
    } else {
      console.assert(config.mode == 'pause');
      this.video.pause();
    }
    this.video.volume = parseInt(config.volume) / 100.0;
    console.log(this.video.currentTime * 1000.0);
  }
}
customElements.define('video-controller', VideoControllerElement);
