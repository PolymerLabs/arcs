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
import {formatTime, MessengerMixin} from './arcs-shared.js';
import './common/object-explorer.js';

class ArcsHcrList extends MessengerMixin(PolymerElement) {
  static get template() {
    return html`
    <style include="shared-styles">
      :host {
        line-height: 24px;
        position: absolute;
        top: 0;
        right: 0;
        bottom: 0;
        left: 0;
        display: flex;
        flex-direction: column;
      }
      header {
        flex-grow: 0;
      }
      [main] {
        flex-grow: 1;
        overflow-y: auto;
      }
      .title {
        padding: 0 8px;
        height: 26px;
        border-bottom: 1px solid var(--mid-gray);
        background-color: var(--light-gray);
      }
      .content {
        border-bottom: 1px solid var(--mid-gray);
        display: flex;
        flex-direction: column;
      }
      [name] {
        color: var(--devtools-purple);
        margin-right: 1ch;
      }
      [id] {
        color: var(--devtools-red);
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
      .toggletext {
        width: 120px;
        color: #838783;
        font-size: 10px;
        position: absolute;
        top: 8px;
        left: 35px;
      }
      .toggleicon {
        position: relative;
        display: inline-block;
        margin-left: 5px;
      }
    </style>

    <header class="header">
      <div section>
        <span class="toggleicon">
          <label class="switch">
            <input type="checkbox" on-click="_loadServer" id="toggle">
            <span class="slider round"></span>
          </label>
          <span class="toggletext">
            Hot Code Reload
          </span>
        </div>
      </div>
    </header>

    <div main>
      <div class="title">Reloadable Particles</div>
      <div class="content">
        <template is="dom-repeat" items="{{reloadableParticles}}">
          <object-explorer log-id$="[[item.implFile]]" object="{{item}}">
            <span name>[[item.name]]</span>
            <span id>[[item.id]]</span>
          </object-explorer>
        </template>
        <template is="dom-if" if="{{!item.items.length}}">
          <div class="empty-label">No Particles</div>
        </template>
      </div>
    </div>`;
  }

  static get is() { return 'arcs-hcr-list'; }

  constructor() {
    super();
    this.websocket = null;
    this.particleSources = new Set();
    this.arcIdsToKeepFresh = [];

    this.pathToTimeLog = new Map();
    this.reloadableParticles = [];
    this.allParticlesInArc = [];
  }

  onRawMessageBundle(messages) {
    for (const msg of messages) {
      switch (msg.messageType) {
        case 'arc-available': {
          if (!msg.messageBody.speculative) {
            const id = msg.meta.arcId.toString();
            this.arcIdsToKeepFresh.push(id);
          }
          break;
        }
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

  onMessageBundle(messages) {
    for (const msg of messages) {
      switch (msg.messageType) {
        case 'arc-selected':
          this.reloadableParticles = [];
          this.allParticlesInArc = [];
          break;

        case 'PecLog': {
          const m = msg.messageBody;
          switch (m.name) {
            case 'InstantiateParticle': {
              const particleId = m.pecMsgBody.id.toString();
              const spec = m.pecMsgBody.spec;

              this.allParticlesInArc.push({id: particleId, spec: spec});
              this._displayLog(particleId, spec);
            }
          }
          break;
        }
      }
    }
  }

  _displayLog(particleId, spec) {
    if (this.pathToTimeLog.has(spec.implFile)) {
      const particle = {
        name: spec.name,
        id: particleId,
        implFile: spec.implFile,
        time: this.pathToTimeLog.get(spec.implFile)
      };
      this.reloadableParticles.push(particle);
    }
  }

  _updateLog(filePath) {
    const time = this._getCurrentTime();
    if (!this.pathToTimeLog.has(filePath)) {
      this.pathToTimeLog.set(filePath, []);
    }
    const timeLog = this.pathToTimeLog.get(filePath);
    if (!timeLog.includes(time)) timeLog.push(time);

    [...this.reloadableParticles].forEach(particle => {
      if (particle.implFile == filePath) {
        const explorer =  this.shadowRoot.querySelector(`object-explorer[log-id="${filePath}"]`);
        if (explorer) {
          explorer.refresh();
          explorer.flash();
        }
      }
    });
  }

  _loadServer() {
    if (this.$.toggle.checked) {
      this.$.toggle.checked = false;

      this.websocket = new WebSocket('ws://localhost:8888');
      this.websocket.onopen = e => {
        this.$.toggle.checked = true;

        this.websocket.onmessage = msg => {
          msg = JSON.parse(msg.data);
          this._updateLog(msg.path);
          switch (msg.operation) {
            case 'watch':
              this.reloadableParticles = [];
              this.allParticlesInArc.forEach(p => {
                this._displayLog(p.id, p.spec);
              });
              break;
            case 'reload':
              this.arcIdsToKeepFresh.forEach(id => {
                this.send({
                    messageType: 'particle-reload',
                    messageBody: msg.path,
                    arcId: id
                });
              });
              break;
          }
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
      this.logging = new Map();
      this.reloadableParticles = [];
    }
  }

  _getCurrentTime() {
    return formatTime(Date.now());
  }
}

window.customElements.define(ArcsHcrList.is, ArcsHcrList);