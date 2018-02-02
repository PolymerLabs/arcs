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

import runtime from './runtime.js';
import ParticleSpec from './particle-spec.js';
import tracing from '../tracelib/trace.js';
import assert from '../platform/assert-web.js';
import Schema from './schema.js';

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

  /** @method setViews(views)
   * This method is invoked with a handle for each view this particle
   * is registered to interact with, once those views are ready for
   * interaction. Override the method to register for events from
   * the views.
   *
   * Views is a map from view names to view handles.
   */
  setViews(views) {

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

  /** @method on(views, names, kind, f)
   * Convenience method for registering a callback on multiple views at once.
   *
   * views is a map from names to view handles
   * names indicates the views which should have a callback installed on them
   * kind is the kind of event that should be registered for
   * f is the callback function
   */
  on(views, names, kind, f) {
    if (typeof names == 'string')
      names = [names];
    let trace = tracing.start({cat: 'particle', names: this.constructor.name + '::on', args: {view: names, event: kind}});
    names.forEach(name => views.get(name).on(kind, tracing.wrap({cat: 'particle', name: this.constructor.name, args: {view: name, event: kind}}, f), this));
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
    let descriptions = this._views.get('descriptions');
    if (descriptions) {
      descriptions.store(new descriptions.entityClass({key: connectionName, value: pattern}, connectionName));
      return true;
    }
    return false;
  }
  // TODO: Move to transformation-particle class.
  // TODO: Don't serialize schemas, once partial schemas are in use.
  serializeSchema(hostedParticle) {
    let hostedConnSchemas = new Set();
    hostedParticle.connections.forEach(conn => {
      hostedConnSchemas.add((conn.type.isSetView ? conn.type.primitiveType() : conn.type).entitySchema.toString());
    });
    let schemaString =
`${[...hostedConnSchemas].map(schema => schema.toString()).join('\n\r')}
${hostedParticle.toString()}`;
    return schemaString;
  }
}

export class ViewChanges {
  constructor(views, names, type) {
    if (typeof names == 'string')
      names = [names];
    this.names = names;
    this.views = views;
    this.type = type;
  }
  register(particle, f) {
    let modelCount = 0;
    let afterAllModels = () => { if (++modelCount == this.names.length) { f(); } };

    for (let name of this.names) {
      let view = this.views.get(name);
      view.synchronize(this.type, afterAllModels, f, particle);
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

export default {Particle, ViewChanges, SlotChanges, StateChanges};
