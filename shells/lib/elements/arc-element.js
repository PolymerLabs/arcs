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
  <div slotid="toproot"></div>
  <div slotid="root"></div>
  <div slotid="modal"></div>
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
    observer.dispatch = (pid, eventlet) => this.dispatchEventlet(this.state.arc, pid, eventlet);
    return observer;
  }
  dispatchEventlet(arc, pid, eventlet) {
    const pidStr = String(pid);
    if (arc) {
      // find the particle from the pid in the message
      const particle = arc.activeRecipe.particles.find(
        particle => String(particle.id) === pidStr
      );
      if (particle) {
        log('firing PEC event for', particle.name);
        // TODO(sjmiles): we need `arc` and `particle` here even though
        // the two are bound together, figure out how to simplify
        arc.pec.sendEvent(particle, /*slotName*/'', eventlet);
      }
    }
  }
};

export const ArcElement = ArcElementMixin(ArcCustomElement);

customElements.define('arc-element', Xen.Debug(ArcElement, log));
