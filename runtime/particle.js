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
var tracing = require('../tracelib/trace.js');
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
         `[${this.spec.type}][${direction}][${tag}]: [${view.connectionName}]`, v));
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
    this.slot = undefined;
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

  on(views, name, action, f) {
    var trace = tracing.start({cat: 'particle', name: this.constructor.name + "::on", args: {view: name, event: action}});
    views.get(name).on(action, tracing.wrap({cat: 'particle', name: this.constructor.name, args: {view: name, event: action}}, f), this);
    trace.end();
  }

  logDebug(tag, view) {
    let direction = this.spec.connectionMap.get(tag).direction;
    view.debugString().then(v => console.log(
       `[${this.spec.type}][${direction}][${tag}]: [${view.connectionName}]`, v));
  }

  fireEvent(eventName) {
    this.slot.fireEvent(eventName);
  }
}

exports.define = define;
exports.Particle = Particle;
