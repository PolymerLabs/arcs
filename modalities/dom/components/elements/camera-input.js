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
<video id="player" width="400" height="300" autoplay ></video>
<canvas id="canvas" style="display: none;" width="400" height="300"></canvas>
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
  audio: false,
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
          this.isRecording = true;
        } else {
          this._stop();
        }
      });
  }

  _stop() {
    this.player.srcObject.getVideoTracks().forEach((track) => track.stop());
    this.player.srcObject = null;
    this.player.pause();
    this.isRecording = false;
  }

  render(props, state) {
    return state;
  }

  capture() {
    // Draw whatever is in the video element on to the canvas.
    this.ctx.drawImage(this.player, 0, 0, 640, 480, 0, 0, 400, 300);
    this.value = {
      width: this.player.width,
      height: this.player.height,
      url: this.canvas.toDataURL('image/jpg', 50),
    };
    this._stop();
    this._fire('capture', this.value);
  }

}

customElements.define('camera-input', CameraInput);
