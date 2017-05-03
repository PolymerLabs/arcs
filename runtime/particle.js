/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
"use strict";

var parser = require("./parser.js");
var runtime = require("./runtime.js");
var ParticleSpec = require("./particle-spec.js");
var tracing = require('tracelib');
var assert = require('assert');   

function define(def, update) {
  let spec = new ParticleSpec(parser.parse(def));
  let clazz = class extends Particle {
    static get spec() {
      return spec;
    }
    static get name() {
      return this.spec.type;
    }
    constructor(scope) {
      super(scope);
    }
    setViews(views) {
      var inputViews = new Map();
      for (let input of this.inputs()) {
        this.on(views, input.name, 'change', async e => {
            this.setBusy();
            var relevance = await update(views, e);
            this.setIdle();
            if (relevance !== undefined)
              this.relevance = relevance;
        });
      }
    }
    logDebug(tag, view) {
      let direction = this.spec.connectionMap.get(tag).direction;
      view.debugString().then(v => console.log(
         `[${this.spec.type}][${direction}][${tag}]: [${view.name}]`, v));
    }
  };
  clazz._isInline = true;
  clazz._inlineDefinition = def;
  clazz._inlineUpdateFunction = update;
  return clazz;
}

class Particle {
  constructor(scope) {
    this.spec = this.constructor.spec.resolve(scope);
    if (this.spec.inputs.length == 0)
      this.extraData = true;
    this.relevances = [];
    this._idle = Promise.resolve();
    this._idleResolver = null;
    this._busy = 0;
    this.slotHandlers = [];
    this.stateHandlers = new Map();
    this.states = new Map();
  }

  // Override this to do stuff
  setViews(views) {

  }

  get busy() {
    return this._busy > 0;
  }

  get idle() {
    return this._idle;
  }

  setBusy() {
    if (this._busy == 0)
    this._idle = new Promise((resolve, reject) => {
      this._idleResolver = resolve;
    });
    this._busy++;
  }

  setIdle() {
    assert(this._busy > 0);
    this._busy--;
    if (this._busy == 0)
      this._idleResolver();
  }

  set relevance(r) {
    this.relevances.push(r);
  }

  // Override this to do stuff
  dataUpdated() {
  }

  inputs() {
    return this.spec.inputs;
  }

  outputs() {
    return this.spec.outputs;
  }

  setSlotCallback(callback) {
    this._slotCallback = callback;
  }

  setSlot(slot) {
    this.slot = slot;
    this.slotPromise = null;
    if (this.slotResolver) {
      this.slotResolver(this.slot); 
    }    
    this.slotResolver = undefined;
    this.slotHandlers.forEach(f => f(true));
  }

  releaseSlot() {
    if (this.slot)
      this._slotCallback(this.slot.id, "No");
    this._clearSlot();
  }
  
  // our slot was released involuntarily
  slotReleased() {
    this._clearSlot();
  }

  _clearSlot() {
    if (this.slot !== undefined) {
      this.slot = undefined;
      this.slotHandlers.forEach(f => f(false));
    }
  }
  
  async requireSlot(id) {
    if (this.slot) {
      return this.slot;
    }
    if (!this.slotPromise) {
      this.slotPromise = new Promise((resolve, reject) => {
        this.slotResolver = resolve;
        this._slotCallback(id, "Need");
      });
    }
    return this.slotPromise;
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

  on(views, names, action, f) {
    if (typeof names == "string")
      names = [names];
    var trace = tracing.start({cat: 'particle', names: this.constructor.name + "::on", args: {view: names, event: action}});
    names.forEach(name => views.get(name).on(action, tracing.wrap({cat: 'particle', name: this.constructor.name, args: {view: name, event: action}}, f), this));
    trace.end();
  }

  logDebug(tag, view) {
    let direction = this.spec.connectionMap.get(tag).direction;
    view.debugString().then(v => console.log(
       `[${this.spec.type}][${direction}][${tag}]: [${view.connectionName}]`, v));
  }

  when(changes, f) {
    changes.forEach(change => change.register(this, f));
  }

  fireEvent(eventName) {
    this.slot.fireEvent(eventName);
  }
}

class ViewChanges {
  constructor(views, names, type) {
    if (typeof names == "string")
      names = [names];
    this.names = names;
    this.views = views;
    this.type = type;
  }
  register(particle, f) {
    particle.on(this.views, this.names, this.type, f);
  }
}

class SlotChanges {
  constructor() {

  }
  register(particle, f) {
    particle.addSlotHandler(f);
  }
}

class StateChanges {
  constructor(states) {
    if (typeof states == "string")
      states = [states];
    this.states = states;
  }
  register(particle, f) {
    particle.addStateHandler(this.states, f);
  }
}

exports.define = define;
exports.Particle = Particle;
exports.ViewChanges = ViewChanges;
exports.SlotChanges = SlotChanges;
exports.StateChanges = StateChanges;