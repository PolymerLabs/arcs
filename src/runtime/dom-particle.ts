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
import {DomParticleBase, RenderModel} from './dom-particle-base.js';
import {Handle, Collection, Singleton} from './handle.js';
import {Runnable} from './hot.js';

export interface StatefulDomParticle extends DomParticleBase {
  // add type info for XenState members here
  _invalidate(): void;
}

// binds XenStateMixin(DomParticleBase) to interface above
export interface DomParticle extends StatefulDomParticle {
}

export interface DomParticleConfig {
  handleNames: string[];
  slotNames: string[];
}

/**
 * Particle that interoperates with DOM and uses a simple state system
 * to handle updates.
 */
export class DomParticle extends XenStateMixin(DomParticleBase) {
  /**
   * Override if necessary, to do things when props change.
   */
  willReceiveProps(...args): void {
  }

  /**
   * Override if necessary, to modify superclass config.
   */
  update(...args): void {
  }

  /**
   * Override to return false if the Particle won't use
   * it's slot.
   */
  shouldRender(...args): boolean {
    return true;
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
   * Getters and setters for removing underscores.
   */
  get state() {
    return this._state;
  }

  set state(state) {
    this.setState(state);
  }

  get props() {
    return this._props;
  }

  /**
   * This is called once during particle setup. Override to control sync and update
   * configuration on specific handles (via their configure() method).
   * `handles` is a map from names to handle instances.
   */
  configureHandles(handles: ReadonlyMap<string, Handle>): void {
    // Example: handles.get('foo').configure({keepSynced: false});
  }

  /**
   * Override if necessary, to modify superclass config.
   */
  get config(): DomParticleConfig {
    // TODO(sjmiles): getter that does work is a bad idea, this is temporary
    return {
      handleNames: this.spec.inputs.map(i => i.name),
      // TODO(mmandlis): this.spec needs to be replaced with a particle-spec loaded from
      // .manifest files, instead of .ptcl ones.
      slotNames: [...this.spec.slotConnections.values()].map(s => s.name)
    };
  }

  // affordances for aliasing methods to remove `_`
  _willReceiveProps(...args): void {
    this.willReceiveProps(...args);
  }

  _update(...args): void {
    this.update(...args);
    if (this.shouldRender(...args)) { // TODO: should shouldRender be slot specific?
      this.relevance = 1; // TODO: improve relevance signal.
    }
    this.config.slotNames.forEach(s => this.renderSlot(s, ['model']));
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
    // TODO(sjmiles): superclass uses Promise.resolve(), try a short timeout here to provide a bit more debouncing
    return setTimeout(done, 10);
  }

  async setHandles(handles: ReadonlyMap<string, Handle>): Promise<void> {
    this.configureHandles(handles);
    this.handles = handles;
    // TODO(sjmiles): we must invalidate at least once, is there a way to know
    // whether handleSync/update will be called?
    this._invalidate();
  }

  async onHandleSync(handle: Handle, model: RenderModel): Promise<void> {
    //console.log(`[${this.spec.name}]:onHandleSync`, handle.name, model);
    this._setProperty(handle.name, model);
  }

  async onHandleUpdate(handle: Handle, update): Promise<void> {
    //onsole.log(`[${this.spec.name}]:onHandleUpdate`, handle.name, update);
    const {name} = handle;
    if (update.data) {
      //console.log(`[${this.spec.name}]::onHandleUpdate::setProperty`, name, JSON.stringify(update.data));
      this._setProperty(name, update.data);
    }
    if (update.added) {
      const prop = (this.props[name] || []).concat(update.added);
      // TODO(sjmiles): it's generally improper to mess with `this.props` directly, but this is a special case
      this.props[name] = prop;
      this._setProperty(name, prop);
      //console.warn(name, update.added, prop);
    }
    if (update.removed) {
      // TODO(sjmiles): probably should update prop instead...(as above)
      const data = await handle["toList"]();
      //console.log(`[${this.spec.name}]::onHandleUpdate::setProperty`, name, data);
      this._setProperty(name, data);
    }
  }

  fireEvent(slotName: string, {handler, data}) {
    if (this[handler]) {
      // TODO(sjmiles): remove `this._state` parameter
      this[handler]({data}, this._state);
    }
  }

  private _debounce(key: string, func: Runnable, delay: number) {
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
