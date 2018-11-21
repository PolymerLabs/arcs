/*
@license
Copyright (c) 2016 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/

import {SlotComposer} from '../../../runtime/ts-build/slot-composer.js';
import {Xen} from '../../lib/xen.js';
import {ArcHost} from '../../lib/arc-host.js';

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
 * `config.manifest` is used by env.spawn to bootstrap a recipe
 * `manifest` is used by WebArc to add a recipe
 */

export class WebArc extends Xen.Debug(Xen.Async, log) {
  static get observedAttributes() {
    return ['env', 'context', 'storage', 'composer', 'config', 'manifest', 'plan'];
  }
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
  update(props, state) {
    const {env, storage, config, manifest, plan} = props;
    if (!state.host && env && storage && config) {
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
    let {env, context, storage, composer, config} = this.props;
    if (config.suggestionContainer) {
      this.containers.suggestions = config.suggestionContainer;
    }
    if (!composer) {
      composer = new SlotComposer({affordance: 'dom', containers: this.containers});
    }
    return new ArcHost(env, context, storage, composer);
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
    //if (state.host.plan) {
    //  this.fire('recipe', state.host.plan);
    //}
  }
}
customElements.define('web-arc', WebArc);
