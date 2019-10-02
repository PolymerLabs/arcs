/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import Xen from '../xen/xen.js';

class MagentaVisualizer extends Xen.Base {
  get template() {
    return Xen.html`
    <style>
      .outer {
        width: 400px;
        height: 400px;
        position: absolute;
        top:0;
        bottom:0;
        left: 0;
        right: 0;
        margin: auto;
      }

      .inner {
        width: 250px;
        height: 10px;
        margin: auto;
        margin-top: 20px;
      }

      .button {
        background-color: white;
        color: black;
        border: 2px solid #555555;
        width: 45px;
        height: 25px;
      }
      
      .button:hover {
        background-color: #555555;
        color: white;
      }
    </style>
    <div class="outer">
      <canvas id="canvas" width="400" height="300"></canvas>
      <div class="inner">
        <button id="start" class="button" on-click="onStart">Start</button>
        <button id="stop" class="button" on-click="onStop">Stop</button>
      </div>
    </div>
    `;
  }

  static get observedAttributes() {
    return ['notes'];
  }

  _didMount() {
    this.canvas = this.host.getElementById('canvas');
  }

  _render(props, state) {
    this.initPage().then(() => {
      this.initVisualizer(props);
      this.initPlayer();
    });
    return state;
  }

  initPage() {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/@magenta/music@1.4.2';
        script.onload = () => resolve();
        script.onerror = (err) => reject(err);
        document.head.appendChild(script);
    });
  }

  initVisualizer(props) {
    if (props.notes && !this.notesSet) {
      this.visualizer = new window.mm.Visualizer(this.notes, this.canvas);
      this.notes = props.notes;
      this.isNotesSet = true;
    }
  }

  initPlayer() {
    if (this.visualizer && !this.player) {
      this.player = new window.mm.Player(true, {
        run: (note) => this.visualizer.redraw(note),
        stop: () => {console.log('done');}
      });
    }
  }

  onStart() {
    this.player.start(this.notes);
  }

  onStop() {
    this.player.stop();
  }
}

customElements.define('magenta-visualizer', MagentaVisualizer);
