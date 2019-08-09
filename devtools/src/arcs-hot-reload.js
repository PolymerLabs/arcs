/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import {PolymerElement} from '../deps/@polymer/polymer/polymer-element.js';
import {html} from '../deps/@polymer/polymer/lib/utils/html-tag.js';
import {MessengerMixin} from './arcs-shared.js';

/**
 * Creates a websocket connection to hot reload websocket server. Acts as a bridge between the file watchers
 * in ALDS and Arcs Runtime, relaying messages between them. This class also keeps tracks of all file sources 
 * that need to be watched and all the active arcs that might need to be reloaded.
 */
class HotReload extends MessengerMixin(PolymerElement) {
  static get template() {
    return html`
    <style include="shared-styles">
      :host {
        display: flex;
        flex-direction: column;
      }
      .switch {
        position: relative;
        display: inline-block;
        width: 30px;
        height: 17px;
      }
      .slider {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: #ccc;
        border-radius: 34px;
      }
      .slider:before {
        position: absolute;
        content: "";
        height: 13px;
        width: 13px;
        left: 2px;
        bottom: 2px;
        background-color: white;
        -webkit-transition: .4s;
        border-radius: 50%;
      }
      input:checked + .slider {
        background-color: #AFF196;
      }
      input:checked + .slider:before {
        -webkit-transform: translateX(13px);
      }
      .tooltip:hover .tooltiptext {
        visibility: visible;
      }
      .tooltip .tooltiptext {
        visibility: hidden;
        width: 120px;
        text-align: center;
        color: #838783;
        font-size: 10px;
        position: absolute;
        top: 8px;
        left: 45%;
      }
      .tooltip {
        position: relative;
        display: inline-block;
      }
    </style>
    <div class="tooltip">
      <label class="switch">
        <input type="checkbox" on-click="_loadServer" id="toggle">
        <span class="slider round"></span>
      </label>
      <span class="tooltiptext">
        Hot Code Reload
      </span>
    </div>`;
  }

  static get is() { return 'arcs-hot-reload'; }

  constructor() {
    super();
    this.websocket = null;
    this.particleSources = new Set();
    this.arcIdsToKeepFresh = [];
  }

  onRawMessageBundle(messages) {
    for (const msg of messages) {
      switch (msg.messageType) {
        case 'arc-available':
          if (!msg.messageBody.speculative) {
            const id = msg.meta.arcId.toString();
            this.arcIdsToKeepFresh.push(id);
          }
          break;
        case 'watch-particle-sources': {
          const before = this.particleSources.size;
          for (const particleSource of msg.messageBody) {
            this.particleSources.add(particleSource);
          }
          if (this.particleSources.size > before && this.websocket != null) {
            const files = JSON.stringify([...this.particleSources]);
            this.websocket.send(files);
          } 
          break;
        }
      }
    }
  }

  _loadServer() {
    if (this.$.toggle.checked) {
      this.$.toggle.checked = false;

      this.websocket = new WebSocket('ws://localhost:8888');
      this.websocket.onopen = e => {
        this.$.toggle.checked = true;

        this.websocket.onmessage = msg => {
          // Notify each arc of the particle source code file which got updated
          this.arcIdsToKeepFresh.forEach(id => {
            this.send({
                messageType: 'particle-reload',
                messageBody: msg.data,
                arcId: id
            });
          });
        };

        this.websocket.send(JSON.stringify([...this.particleSources]));
      };
      this.websocket.onerror = e => {
        alert('No ALDS connection found');
      };

    } else {
      if (this.ws != null) {
        alert('Something went wrong with hot code reload');
      }
      this.websocket.close();
      this.websocket = null;
    }
  }
}

window.customElements.define(HotReload.is, HotReload);
