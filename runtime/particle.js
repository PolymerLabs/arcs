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

import {Tracing} from '../tracelib/trace.js';
import {assert} from '../platform/assert-web.js';

/** @class Particle
 * A basic particle. For particles that provide UI, you may like to
 * instead use DOMParticle.
 */
export class Particle {
  constructor(capabilities) {
    this.spec = this.constructor.spec;
    if (this.spec.inputs.length == 0)
      this.extraData = true;
    this.relevances = [];
    this._idle = Promise.resolve();
    this._idleResolver = null;
    this._busy = 0;
    this.slotHandlers = [];
    this.stateHandlers = new Map();
    this.states = new Map();
    this._slotByName = new Map();
    this.capabilities = capabilities || {};
  }

  /** @method setHandles(handles)
   * This method is invoked with a handle for each store this particle
   * is registered to interact with, once those handles are ready for
   * interaction. Override the method to register for events from
   * the handles.
   *
   * Handles is a map from handle names to store handles.
   */
  setHandles(handles) {
  }
  
  /** @method setViews(views)
   * This method is deprecated. Use setHandles instead.
   */
  setViews(views) {
  }

  /** @method onHandleSync(handle, model, version)
   * Called for handles that are configured with both keepSynced and notifySync, when they are
   * updated with the full model of their data. This will occur once after setHandles() and any time
   * thereafter if the handle is resynchronized.
   *
   * handle: The Handle instance that was updated.
   * model: For Variable-backed Handles, the Entity data or null if the Variable is not set.
   *        For Collection-backed Handles, the Array of Entities, which may be empty.
   * version: The received version number.
   */
  onHandleSync(handle, model, version) {
  }

  /** @method onHandleUpdate(handle, update, version)
   * Called for handles that are configued with notifyUpdate, when change events are received from
   * the backing store. For handles also configured with keepSynced these events will be correctly
   * ordered, with some potential skips if a desync occurs. For handles not configured with
   * keepSynced, all change events will be passed through as they are received.
   *
   * handle: The Handle instance that was updated.
   * update: An object containing one of the following fields:
   *    data: The full Entity for a Variable-backed Handle.
   *    added: An Array of Entities added to a Collection-backed Handle.
   *    removed: An Array of Entities removed from a Collection-backed Handle.
   * version: The received version number.
   */
  onHandleUpdate(handle, update, version) {
  }

  /** @method onHandleDesync(handle, version)
   * Called for handles that are configured with both keepSynced and notifyDesync, when they are
   * detected as being out-of-date against the backing store. For Variables, the event that triggers
   * this will also resync the data and thus this call may usually be ignored. For Collections, the
   * underlying proxy will automatically request a full copy of the stored data to resynchronize.
   * onHandleSync will be invoked when that is received.
   *
   * handle: The Handle instance that was desynchronized.
   * version: The received version number, which will be more than one ahead of the previously
   *          stored data.
   */
  onHandleDesync(handle, version) {
  }

  constructInnerArc() {
    if (!this.capabilities.constructInnerArc)
      throw new Error('This particle is not allowed to construct inner arcs');
    return this.capabilities.constructInnerArc(this);
  }

  get busy() {
    return this._busy > 0;
  }

  get idle() {
    return this._idle;
  }

  /** @method setBusy()
   * Prevents this particle from indicating that it's idle until a matching
   * call to setIdle is made.
   */
  setBusy() {
    if (this._busy == 0)
    this._idle = new Promise((resolve, reject) => {
      this._idleResolver = resolve;
    });
    this._busy++;
  }

  /** @method setIdle()
   * Indicates that a busy period (initiated by a call to setBusy) has completed.
   */
  setIdle() {
    assert(this._busy > 0);
    this._busy--;
    if (this._busy == 0)
      this._idleResolver();
  }

  set relevance(r) {
    this.relevances.push(r);
  }

  inputs() {
    return this.spec.inputs;
  }

  outputs() {
    return this.spec.outputs;
  }

  /** @method getSlot(name)
   * Returns the slot with provided name.
   */
  getSlot(name) {
    return this._slotByName.get(name);
  }

  addSlotHandler(f) {
    this.slotHandlers.push(f);
  }

  addStateHandler(states, f) {
    states.forEach(state => {
      if (!this.stateHandlers.has(state)) {
        this.stateHandlers.set(state, []);
      }
      this.stateHandlers.get(state).push(f);
    });
  }

  emit(state, value) {
    this.states.set(state, value);
    this.stateHandlers.get(state).forEach(f => f(value));
  }

  /** @method on(handles, names, kind, f)
   * Convenience method for registering a callback on multiple handles at once.
   *
   * handles is a map from names to store handles
   * names indicates the handles which should have a callback installed on them
   * kind is the kind of event that should be registered for
   * f is the callback function
   */
  on(handles, names, kind, f) {
    if (typeof names == 'string')
      names = [names];
    let trace = Tracing.start({cat: 'particle', names: this.constructor.name + '::on', args: {handle: names, event: kind}});
    names.forEach(name => handles.get(name).on(kind, Tracing.wrap({cat: 'particle', name: this.constructor.name, args: {handle: name, event: kind}}, f), this));
    trace.end();
  }

  when(changes, f) {
    changes.forEach(change => change.register(this, f));
  }

  fireEvent(slotName, event) {
    // TODO(sjmiles): tests can get here without a `this.slot`, maybe this needs to be fixed in MockSlotManager?
    let slot = this.getSlot(slotName);
    assert(slot, `Particle::fireEvent: slot ${slotName} is falsey`);
    slot.fireEvent(event);
  }

  static buildManifest(strings, ...bits) {
    let output = [];
    for (let i = 0; i < bits.length; i++) {
        let str = strings[i];
        let indent = / *$/.exec(str)[0];
        let bitStr;
        if (typeof bits[i] == 'string')
          bitStr = bits[i];
        else
          bitStr = bits[i].toManifestString();
        bitStr = bitStr.replace(/(\n)/g, '$1' + indent);
        output.push(str);
        output.push(bitStr);
    }
    if (strings.length > bits.length)
      output.push(strings[strings.length - 1]);
    return output.join('');
  }

  setParticleDescription(pattern) {
    return this.setDescriptionPattern('_pattern_', pattern);
  }
  setDescriptionPattern(connectionName, pattern) {
    let descriptions = this.handles.get('descriptions');
    if (descriptions) {
      descriptions.store(new descriptions.entityClass({key: connectionName, value: pattern}, connectionName));
      return true;
    }
    return false;
  }
}

export class HandleChanges {
  constructor(handles, names, type) {
    if (typeof names == 'string')
      names = [names];
    this.names = names;
    this.handles = handles;
    this.type = type;
  }
  register(particle, f) {
    let modelCount = 0;
    let afterAllModels = () => { if (++modelCount == this.names.length) { f(); } };

    for (let name of this.names) {
      let handle = this.handles.get(name);
      handle.synchronize(this.type, afterAllModels, f, particle);
    }
  }
}

export class SlotChanges {
  constructor() {
  }
  register(particle, f) {
    particle.addSlotHandler(f);
  }
}

export class StateChanges {
  constructor(states) {
    if (typeof states == 'string')
      states = [states];
    this.states = states;
  }
  register(particle, f) {
    particle.addStateHandler(this.states, f);
  }
}

