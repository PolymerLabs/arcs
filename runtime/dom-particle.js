/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
'use strict';

import {XenStateMixin} from '../shell/components/xen/xen-state.js';
import {DomParticleBase} from './dom-particle-base.js';

/** @class DomParticle
 * Particle that interoperates with DOM and uses a simple state system
 * to handle updates.
 */
export class DomParticle extends XenStateMixin(DomParticleBase) {
  constructor() {
    super();
    // alias properties to remove `_`
    this.state = this._state;
    this.props = this._props;
  }
  /** @method willReceiveProps(props, state, oldProps, oldState)
   * Override if necessary, to do things when props change.
   */
  willReceiveProps() {
  }
  /** @method update(props, state, oldProps, oldState)
   * Override if necessary, to modify superclass config.
   */
  update() {
  }
  /** @method shouldRender(props, state, oldProps, oldState)
   * Override to return false if the Particle won't use
   * it's slot.
   */
  shouldRender() {
    return true;
  }
  /** @method render(props, state, oldProps, oldState)
   * Override to return a dictionary to map into the template.
   */
  render() {
    return {};
  }
  /** @method setState(state)
   * Copy values from `state` into the particle's internal state,
   * triggering an update cycle unless currently updating.
   */
  setState(state) {
    return this._setState(state);
  }
  // TODO(sjmiles): deprecated, just use setState
  setIfDirty(state) {
    console.warn('DomParticle: `setIfDirty` is deprecated, please use `setState` instead');
    return this._setState(state);
  }
  /** @method configureHandles(handles)
   * This is called once during particle setup. Override to control sync and update
   * configuration on specific handles (via their configure() method).
   * `handles` is a map from names to handle instances.
   */
  configureHandles(handles) {
    // Example: handles.get('foo').configure({keepSynced: false});
  }
  /** @method get config()
   * Override if necessary, to modify superclass config.
   */
  get config() {
    // TODO(sjmiles): getter that does work is a bad idea, this is temporary
    return {
      handleNames: this.spec.inputs.map(i => i.name),
      // TODO(mmandlis): this.spec needs to be replaced with a particle-spec loaded from
      // .manifest files, instead of .ptcl ones.
      slotNames: [...this.spec.slots.values()].map(s => s.name)
    };
  }
  // affordances for aliasing methods to remove `_`
  _willReceiveProps(...args) {
    this.willReceiveProps(...args);
  }
  _update(...args) {
    this.update(...args);
    if (this.shouldRender(...args)) { // TODO: should shouldRender be slot specific?
      this.relevance = 1; // TODO: improve relevance signal.
    }
    this.config.slotNames.forEach(s => this.renderSlot(s, ['model']));
  }
  //
  // deprecated
  get _views() {
    console.warn(`Particle ${this.spec.name} uses deprecated _views getter.`);
    return this.handles;
  }
  async setViews(views) {
    console.warn(`Particle ${this.spec.name} uses deprecated setViews method.`);
    return this.setHandles(views);
  }
  // end deprecated
  //
  async setHandles(handles) {
    this.configureHandles(handles);
    this.handles = handles;
    this._handlesToSync = new Set();
    for (const name of this.config.handleNames) {
      const handle = handles.get(name);
      if (handle && handle.options.keepSynced && handle.options.notifySync) {
        this._handlesToSync.add(name);
      }
    }
    // make sure we invalidate once, even if there are no incoming handles
    setTimeout(() => !this._hasProps && this._invalidate(), 200);
    //this._invalidate();
  }
  async onHandleSync(handle, model) {
    this._handlesToSync.delete(handle.name);
    if (this._handlesToSync.size == 0) {
      await this._handlesToProps();
    }
  }
  async onHandleUpdate(handle, update) {
    // TODO(sjmiles): debounce handles updates
    const work = () => {
      //console.warn(handle, update);
      this._handlesToProps();
    };
    this._debounce('handleUpdateDebounce', work, 100);
  }
  async _handlesToProps() {
    const config = this.config;
    // acquire (async) list data from handles; BigCollections map to the handle itself
    const data = await Promise.all(
      config.handleNames
      .map(name => this.handles.get(name))
      .map(handle => {
        if (handle.toList) return handle.toList();
        if (handle.get) return handle.get();
        return handle;
      })
    );
    // convert handle data (array) into props (dictionary)
    const props = Object.create(null);
    config.handleNames.forEach((name, i) => {
      props[name] = data[i];
    });
    this._hasProps = true;
    this._setProps(props);
  }
  fireEvent(slotName, {handler, data}) {
    if (this[handler]) {
      // TODO(sjmiles): remove `this._state` parameter
      this[handler]({data}, this._state);
    }
  }
  _debounce(key, func, delay) {
    const subkey = `_debounce_${key}`;
    if (!this._state[subkey]) {
      this.startBusy();
    }
    const idleThenFunc = () => {
      this.doneBusy();
      func();
      this._state[subkey] = null;
    };
    super._debounce(key, idleThenFunc, delay);
  }
}
