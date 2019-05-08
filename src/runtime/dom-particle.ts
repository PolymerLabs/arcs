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
import {DomParticleBase} from './dom-particle-base.js';
import {Collection, Handle, Variable} from './handle.js';

interface StatefulDomParticle extends DomParticleBase {
  // add type info for XenState members here
  _invalidate(): void;
}

// binds XenStateMixin(DomParticleBase) to interface above
export interface DomParticle extends StatefulDomParticle {
}

/**
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

  /**
   * Override if necessary, to do things when props change.
   */
  willReceiveProps(...args) {
  }

  /**
   * Override if necessary, to modify superclass config.
   */
  update(...args) {
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
  render(...args) {
    return {};
  }

  /**
   * Copy values from `state` into the particle's internal state,
   * triggering an update cycle unless currently updating.
   */
  setState(state) {
    return this._setState(state);
  }

  /**
   * This is called once during particle setup. Override to control sync and update
   * configuration on specific handles (via their configure() method).
   * `handles` is a map from names to handle instances.
   */
  configureHandles(handles: ReadonlyMap<string, Handle>) {
    // Example: handles.get('foo').configure({keepSynced: false});
  }

  /**
   * Override if necessary, to modify superclass config.
   */
  get config() {
    // TODO(sjmiles): getter that does work is a bad idea, this is temporary
    return {
      handleNames: this.spec.inputs.map(i => i.name),
      // TODO(mmandlis): this.spec needs to be replaced with a particle-spec loaded from
      // .manifest files, instead of .ptcl ones.
      slotNames: [...this.spec.slotConnections.values()].map(s => s.name)
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

  /** @deprecated */
  get _views() {
    console.warn(`Particle ${this.spec.name} uses deprecated _views getter.`);
    return this.handles;
  }

  async setHandles(handles: ReadonlyMap<string, Handle>): Promise<void> {
    this.configureHandles(handles);
    this.handles = handles;
    this._handlesToSync = new Set();
    for (const name of this.config.handleNames) {
      const handle = handles.get(name);
      if (handle && handle.options.keepSynced && handle.options.notifySync) {
        this._handlesToSync.add(name);
      }
    }
    // TODO(sjmiles): we must invalidate at least once,
    // let's assume we will miss _handlesToProps if handlesToSync is empty
    if (!this._handlesToSync.length) {
      this._invalidate();
    }
  }

  async onHandleSync(handle: Handle, model): Promise<void> {
    this._handlesToSync.delete(handle.name);
    if (this._handlesToSync.size === 0) {
      await this._handlesToProps();
    }
  }

  async onHandleUpdate(handle: Handle, update): Promise<void> {
    // TODO(sjmiles): debounce handles updates
    const work = () => {
      //console.warn(handle, update);
      this._handlesToProps();
    };
    this._debounce('handleUpdateDebounce', work, 300);
  }

  async _handlesToProps() {
    // convert handle data (array) into props (dictionary)
    const props = Object.create(null);
    // acquire list data from handles
    const {handleNames} = this.config;
    // data-acquisition is async
    await Promise.all(handleNames.map(name => this._addNamedHandleData(props, name)));
    // initialize properties
    this._setProps(props);
  }

  async _addNamedHandleData(dictionary, handleName) {
    const handle = this.handles.get(handleName);
    if (handle) {
      dictionary[handleName] = await this._getHandleData(handle);
    }
  }

  async _getHandleData(handle: Handle) {
    if (handle instanceof Collection) {
      return await (handle as Collection).toList();
    }
    if (handle instanceof Variable) {
      return await (handle as Variable).get();
    }
    // other types (e.g. BigCollections) map to the handle itself
    return handle;
  }

  fireEvent(slotName: string, {handler, data}) {
    if (this[handler]) {
      // TODO(sjmiles): remove `this._state` parameter
      this[handler]({data}, this._state);
    }
  }

  _debounce(key: string, func: Function, delay: number) {
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
