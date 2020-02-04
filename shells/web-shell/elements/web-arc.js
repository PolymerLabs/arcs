/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {Xen} from '../../lib/components/xen.js';
import {ArcHost} from '../../lib/components/arc-host.js';
import {SlotComposer} from '../../../build/runtime/slot-composer.js';

const log = Xen.logFactory('WebArc', '#cb23a6');

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

/*
 * TODO(sjmiles): this is messed up, fix:
 * `config.manifest` is used by `Runtime.spawnArc` to bootstrap a recipe in a new Arc
 * `manifest` is used by WebArc to add a recipe to an existing Arc
 */

// config = {id, [serialization], [manifest]}

export class WebArc extends Xen.Debug(Xen.Async, log) {
  static get observedAttributes() {
    return ['context', 'storage', 'composer', 'config', 'manifest', 'plan'];
  }
  get template() {
    return template;
  }
  _didMount() {
    const slots = ['toproot', 'root', 'modal'];
    this.containers = {};
    slots.forEach(slot => {
      this.containers[slot] = this.host.querySelector(`[slotid="${slot}"]`);
    });
  }
  update(props, state) {
    const {storage, config, manifest, plan} = props;
    if (!state.host && storage && config) {
      this.state = {host: this.createHost()};
    }
    if (state.host && config && config !== state.config) {
      this.disposeArc(state.host);
      this.state = {config, arc: null};
    }
    if (!state.arc && config && state.host) {
      this.awaitState('arc', async () => this.spawnArc(state.host, config));
    }
    // will attempt to instantiate first recipe in `manifest`
    if (state.host && state.manifest !== manifest) {
      this.state = {manifest};
      if (manifest) {
        state.host.manifest = manifest;
      }
    }
    if (plan && state.host && plan !== state.plan) {
      state.host.plan = state.plan = plan;
    }
  }
  createHost() {
    log('creating host');
    let {context, storage, composer} = this.props;
    if (!composer) {
      composer = new SlotComposer();
    }
    return new ArcHost(context, storage, composer);
  }
  disposeArc(host) {
    log('disposing arc');
    host.disposeArc();
    this.fire('arc', null);
  }
  async spawnArc(host, config) {
    log(`spawning arc [${config.id}]`);
    const arc = await host.spawn(config);
    log(`arc spawned [${config.id}]`);
    this.fire('arc', arc);
    return arc;
  }
}
customElements.define('web-arc', WebArc);
