/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {logsFactory} from '../../../build/runtime/log-factory.js';
import {Xen} from '../components/xen.js';
import {ArcComponentMixin} from '../components/arc-component.js';
import {SlotObserver} from '../xen-renderer.js';

const ArcCustomElement = ArcComponentMixin(Xen.AsyncMixin(Xen.Base));

const {log, warn} = logsFactory('ArcElement', '#bb1396');

const template = Xen.Template.html`
  <style>
    :host {
      display: block;
    }
    [slotid="modal"] {
      position: fixed;
      top: 0;
      right: 0;
      bottom: 0;
      left: 0;
      box-sizing: border-box;
      pointer-events: none;
    }
  </style>
  <div slotid="toproot" id="rootslotid-toproot" ></div>
  <div slotid="root" id="rootslotid-root"></div>
  <div slotid="modal" id="rootslotid-modal"></div>
`;

const ArcElementMixin = Base => class extends Base {
  get template() {
    return template;
  }
  _didMount() {
    this.containers = {
      toproot: this.host.querySelector('[slotid="toproot"]'),
      root: this.host.querySelector('[slotid="root"]'),
      modal: this.host.querySelector('[slotid="modal"]')
    };
  }
  // arcs delegate ui work to a `ui-broker`
  createBroker() {
    const observer = new SlotObserver(this.host);
    // TODO(sjmiles): `this.state.host.composer.arc` is < ideal
    observer.dispatch = (pid, eventlet) => this.dispatchEventlet(this.state.host.composer.arc, pid, eventlet);
    return observer;
  }
  dispatchEventlet(arc, pid, eventlet) {
    this.state.host.composer.sendEvent(pid, eventlet);
  }
};

export const ArcElement = ArcElementMixin(ArcCustomElement);

customElements.define('arc-element', Xen.Debug(ArcElement, log));
