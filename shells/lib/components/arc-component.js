/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {Xen} from './xen.js';
import {ArcHost} from './arc-host.js';
import {SlotComposer} from '../../../build/runtime/slot-composer.js';
import {logsFactory} from '../../../build/platform/logs-factory.js';

const {log, warn} = logsFactory('ArcComponent', '#cb23a6');

// TODO(sjmiles): custom elements must derive from HTMLElement. Because we want to choose whether to make this an
// element or not (flexible derivation), we implement as a mixin.
export const ArcComponentMixin = Base => class extends Base {
  // TODO(sjmiles): Although this is strictly speaking a CustomElement API, we use it WLOG to
  // implement observable properties. I could call it observedProperties and delegate
  // observedAttributes to it, but I haven't bothered.
  static get observedAttributes() {
    return ['context', 'storage', 'composer', 'config', 'manifest', 'plan'];
  }
  propChanged(name) {
    return (this.props[name] !== this._lastProps[name]);
  }
  update(props, state) {
    if (this.propChanged('config')) {
      if (state.host) {
        this.disposeArc(state.host);
      }
    }
    if (!state.host && props.config && props.storage && props.context) {
      this.state = {host: this.createHost(props)};
    }
    if (state.host && !state.arc && props.config) {
      this.spawnArc(state.host, props.config);
    }
    if (state.host && this.propChanged('manifest')) {
      if (props.manifest) {
        // causes host to (attempt to) instantiate first recipe in `manifest`
        state.host.manifest = props.manifest;
      }
    }
    if (state.host && props.plan && this.propChanged('plan')) {
      state.host.plan = props.plan;
    }
  }
  createHost({context, storage, composer, config}) {
    log('creating host');
    const containers = this.containers || {};
    if (!composer) {
      if (config.suggestionContainer) {
        containers.suggestions = config.suggestionContainer;
      }
      composer = new SlotComposer(/*{containers}*/);
      composer.observeSlots(config.broker || this.createBroker());
    }
    return new ArcHost(context, storage, composer);
  }
  createBroker() {
    return null;
  }
  spawnArc(host, config) {
    // awaitState blocks re-entry until the async function has returned
    this.awaitState('arc', async () => this.spawnArcAsync(host, config));
  }
  async spawnArcAsync(host, config) {
    log(`spawning arc [${config.id}]`);
    const arc = await host.spawn(config);
    log(`arc spawned [${config.id}]`);
    this.fire('arc', arc);
    return arc;
  }
  disposeArc(host) {
    log('disposing arc');
    host.disposeArc();
    this.state = {arc: null};
    this.fire('arc', null);
  }
};

export const LauncherArc = Xen.Debug(Xen.AsyncMixin(ArcComponentMixin(Xen.BaseMixin(class {}))), log);
