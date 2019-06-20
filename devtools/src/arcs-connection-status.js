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
import {MessengerMixin} from './arcs-shared.js';
import {html} from '../deps/@polymer/polymer/lib/utils/html-tag.js';

class ArcsConnectionStatus extends MessengerMixin(PolymerElement) {
  static get template() {
    return html`
    <style include="shared-styles">
      :host {
        position: fixed;
        top: 0;
        right: 0;
        bottom: 0;
        left: 0;
        background: rgba(0, 0, 0, .3);
        z-index: 10;
        display: flex;
        justify-content: center;
        align-items: center;
      }
      :host(:not([visible])) {
        display: none;
      }
      [window] {
        background: white;
        padding: 32px;
        box-shadow: var(--drop-shadow);
        position: relative;
        font-size: 14px;
      }
      [buttons] {
        margin-top: 18px;
        text-align: right;
      }
      [buttons] button {
        margin-left: 8px;
      }
      :host(:not([confirmable])) [buttons] {
        display: none;
      }
    </style>
    <div window>
      <div>[[text]]</div>
      <div buttons>
        <button type="button" on-click="onCancel">Cancel</button>
        <button type="button" on-click="onOk" id="ok">OK</button>
      </div>
    </div>
`;
  }

  static get is() { return 'arcs-connection-status'; }

  static get properties() {
    return {
      visible: {
        type: Boolean,
        value: false,
        reflectToAttribute: true
      },
      confirmable: {
        type: Boolean,
        value: false,
        reflectToAttribute: true
      },
      text: String,
      tag: String
    };
  }

  onMessage(msg) {
    switch (msg.messageType) {
      case 'connection-status-waiting':
        return this.notify({text: 'Waiting for Arcs Shell...'});
      case 'connection-status-disconnected':
        return this.notifyDisconnected();
      case 'connection-status-broken':
        return this.notify({text: msg.messageBody});
      case 'connection-status-connected':
        this.notify({text: 'Connected.'});
        setTimeout(() => {
          this.visible = false;
        }, 500);
        return;
      case 'connection-status-heartbeat':
        clearTimeout(this.heartbeatTimeout);
        this.heartbeatTimeout = setTimeout(
          () =>this.notifyDisconnected(), 5000);
        return;
    }
  }

  notifyDisconnected() {
    this.notify({
      text: 'Arcs Shell appears disconnected. Reload and attempt reconnecting?',
      onOk: () => window.location.reload()
    });
  }

  notify({text, onOk}) {
    this.text = text;
    this.visible = true;
    if (onOk) {
      this.confirmable = true;
      this.onOk = onOk;
      this.$.ok.focus();  
    } else {
      this.confirmable = false;
    }
  }

  onOk() {
    this.onOk();
    this.onOk = null;
    this.visible = false;
  }

  onCancel() {
    this.visible = false;
  }
}

window.customElements.define(ArcsConnectionStatus.is, ArcsConnectionStatus);
