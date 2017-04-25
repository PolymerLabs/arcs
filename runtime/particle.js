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

  setSlot(slot) {
    this.slot = slot;
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

  releaseSlot() {
    
  }

  requireSlot() {
    
  }

  on(views, name, action, f) {
    var trace = tracing.start({cat: 'particle', name: this.constructor.name + "::on", args: {view: name, event: action}});
    views.get(name).on(action, tracing.wrap({cat: 'particle', name: this.constructor.name, args: {view: name, event: action}}, f), this);
    trace.end();
  }
}

exports.define = define;
exports.Particle = Particle;
