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
import {UiParticleBase} from './ui-particle-base.js';
import {Handle} from './storageNG/handle.js';
import {Runnable} from './hot.js';
import {CRDTTypeRecord} from './crdt/crdt.js';

export interface UiStatefulParticle extends UiParticleBase {
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
export class UiParticle extends XenStateMixin(UiParticleBase) {
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
   * This is a merge, not an assignment.
   */
  set state(state) {
    this.setState(state);
  }

  get props() {
    return this._props;
  }

  _shouldUpdate() {
    // do not update() unless all handles are sync'd
    return this._handlesToSync <= 0;
  }

  _update(...args): void {
    /*const updateDirective =*/ this.update(...args);
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

  onReady() : Promise<void> {
    // ensure we `update()` at least once
    this._invalidate();
    return super.onReady();
  }

  async onHandleSync(handle: Handle<CRDTTypeRecord>, model): Promise<void> {
    this._setProperty(handle.name, model);
  }

  async onHandleUpdate({name}: Handle<CRDTTypeRecord>, {data, added, removed}): Promise<void> {
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
        const removedList = Array.isArray(removed) ? removed : [removed];
        removedList.forEach(removed => {
          // TODO(sjmiles): linear search is inefficient
          const index = prop.findIndex(entry => this.idFor(entry) === this.idFor(removed));
          if (index >= 0) {
            prop.splice(index, 1);
          } else {
            console.warn(`ui-particle::onHandleUpdate: couldn't find item to remove`);
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
