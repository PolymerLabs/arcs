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

let template = Xen.html`
<video id="player"  autoplay ></video>
<canvas id="canvas" style="display: none;" width="640" height="480"></canvas>
<br/>
<span>
    <button id="recordbutton" on-click="record">Start Recording</button>
    <button id="capturebutton" on-click="capture">Take Picture</button>
</span>
`;
template = Xen.Template.createTemplate(template);

//const log = Xen.logFactory('MicInput', 'blue');

const constraints = {
  video: true,
};

class CameraInput extends Xen.Base {

  get template() {
    return template;
  }

  _didMount() {
    this.player = this.host.getElementById('player');
    this.canvas = this.host.getElementById('canvas');
    this.ctx = this.canvas.getContext('2d');
    this.isRecording = false;
  }

  record() {

    navigator.mediaDevices.getUserMedia(constraints)
      .then((stream) => {
        if (!this.isRecording) {
          this.player.srcObject = stream;
          this.player.play();
        } else {
          this._stop();
        }
        this.isRecording = !this.isRecording;
      });
  }

  _stop() {
    navigator.mediaDevices.getUserMedia(constraints)
      .then((stream) => {
        this.player.pause();
        stream.getVideoTracks().forEach((track) => track.stop());
      });
  }

  _update(props, state) {
  }

  _render(props, state) {
    return state;
  }

  start() {

  }

  stop() {

  }

  capture() {
    this._stop();
    // Draw whatever is in the video element on to the canvas.
    this.ctx.drawImage(this.player, 0, 0);
    const imageData = this.ctx.getImageData(0, 0, 640, 480);
    this.value = {
      pixels: imageData.data, width: imageData.width, height: imageData.height,
      url: this.canvas.toDataURL('image/png')
    };
    this._fire('capture', this.value);
  }

}

customElements.define('camera-input', CameraInput);
