/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {XenStateMixin} from '../../modalities/dom/components/xen/xen-state.js';
import {UiSimpleParticle, RenderModel} from './ui-simple-particle.js';
import {Handle, Collection, Singleton} from './handle.js';
import {Runnable} from './hot.js';

export interface UiStatefulParticle extends UiSimpleParticle {
  // add type info for XenState members here
  _invalidate(): void;
}

// binds implementation below to interface above
export interface UiParticle extends UiStatefulParticle {
}

/**
 * Particle that interoperates with DOM and uses a simple state system
 * to handle updates.
 */
// TODO(sjmiles): seems like this is really `UiStatefulParticle` but it's
// used so often, I went with the simpler name
export class UiParticle extends XenStateMixin(UiSimpleParticle) {
  /**
   * Override if necessary, to do things when props change.
   * Avoid if possible, use `update` instead.
   */
  willReceiveProps(...args): void {
  }

  // affordance so subclasses can avoid `_`
  _willReceiveProps(...args): void {
    this.willReceiveProps(...args);
  }

  /**
   * Override to do things when props or state change.
   */
  update(...args): void {
  }

  /**
   * Override to return a dictionary to map into the template.
   */
  render(...args): RenderModel {
    return {};
  }

  /**
   * Copy values from `state` into the particle's internal state,
   * triggering an update cycle unless currently updating.
   */
  setState(state): boolean | undefined {
    return this._setState(state);
  }

  /**
   * Getters and setters for working with state/props.
   */
  get state() {
    return this._state;
  }

  /**
   * Syntactic sugar: `this.state = {state}` is equivalent to `this.setState(state)`.
   * This is actually a merge, not an assignment.
   */
  set state(state) {
    this.setState(state);
  }

  get props() {
    return this._props;
  }

  _update(...args): void {
    this.update(...args);
    //
    if (this.shouldRender(...args)) { // TODO: should shouldRender be slot specific?
      this.relevance = 1; // TODO: improve relevance signal.
      this.renderOutput(...args);
    }
  }

  _async(fn) {
    // asynchrony in Particle code must be bookended with start/doneBusy
    this.startBusy();
    const done = () => {
      try {
        fn.call(this);
      } finally {
        this.doneBusy();
      }
    };
    // TODO(sjmiles): superclass uses Promise.resolve(),
    // but here use a short timeout for a wider debounce
    return setTimeout(done, 10);
  }

  async setHandles(handles: ReadonlyMap<string, Handle>): Promise<void> {
    this.configureHandles(handles);
    this.handles = handles;
    // TODO(sjmiles): we must invalidate at least once, is there a way to know
    // whether handleSync/update will be called?
    this._invalidate();
  }

  /**
   * This is called once during particle setup. Override to control sync and update
   * configuration on specific handles (via their configure() method).
   * `handles` is a map from names to handle instances.
   */
  configureHandles(handles: ReadonlyMap<string, Handle>): void {
    // Example: handles.get('foo').configure({keepSynced: false});
  }

  async onHandleSync(handle: Handle, model: RenderModel): Promise<void> {
    this._setProperty(handle.name, model);
  }

  async onHandleUpdate({name}: Handle, {data, added, removed}): Promise<void> {
    if (data !== undefined) {
      //console.log('update.data:', JSON.stringify(data, null, '  '));
      this._setProps({[name]: data});
    }
    if (added) {
      //console.log('update.added:', JSON.stringify(added, null, '  '));
      const prop = (this.props[name] || []).concat(added);
      // TODO(sjmiles): generally improper to set `this._props` directly, this is a special case
      this._props[name] = prop;
      this._setProps({[name]: prop});
    }
    if (removed) {
      //console.log('update.removed:', JSON.stringify(removed, null, '  '));
      const prop = this.props[name];
      if (Array.isArray(prop)) {
        removed.forEach(removed => {
          // TODO(sjmiles): linear search is inefficient
          const index = prop.findIndex(entry => this.idFor(entry) === this.idFor(removed));
          if (index >= 0) {
            prop.splice(index, 1);
          } else {
            console.warn(`dom-particle::onHandleUpdate: couldn't find item to remove`);
          }
        });
        this._setProps({[name]: prop});
      }
    }
  }

  fireEvent(slotName: string, {handler, data}) {
    if (this[handler]) {
      // TODO(sjmiles): remove deprecated `this._state` parameter
      this[handler]({data}, this._state);
    }
  }

  debounce(key: string, func: Runnable, delay: number) {
    const subkey = `_debounce_${key}`;
    const state = this.state;
    if (!state[subkey]) {
      state[subkey] = true;
      this.startBusy();
    }
    const idleThenFunc = () => {
      this.doneBusy();
      func();
      state[subkey] = null;
    };
    // TODO(sjmiles): rewrite Xen debounce so caller has idle control
    super._debounce(key, idleThenFunc, delay);
  }
}
