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

function define(def, update) {
  let spec = new ParticleSpec(parser.parse(def));
  return class extends Particle {
    static get spec() {
      return spec;
    }
    static get name() {
      return this.spec.type;
    }
    constructor(arc) {
      super(arc);
    }
    dataUpdated(dataFlag) {
      if (dataFlag) {
        var result = this._pendingValue;
      } else {
        let inputs = {};
        for (let input of this.inputs()) {  
          inputs[input.name] = this[input.name];
        }
        var result = update(inputs);
        if (typeof result == 'function') {
          this._generator = result();
          result = this._generator.next().value;
        }
      }
      if (this._generator !== undefined) {
        this._pendingValue = this._generator.next().value;
        if (this._pendingValue !== undefined) {
          this.extraData = true;
        } else {
          this.extraData = false;
          this._generator = undefined;
        }
      }
      Object.assign(this, result);
      this.commitData(this.relevance);

    }
  };
}

class Particle {
  constructor(arc) {
    this.arc = arc;
    this.spec = this.constructor.spec.resolve(arc.scope);
    arc.register(this);
  }

  // Override this to do stuff
  dataUpdated() {
  }

  commitData(relevance) {
    this.arcParticle.commitData(relevance);
  }

  inputs() {
    return this.spec.inputs;
  }

  outputs() {
    return this.spec.outputs;
  }

}

exports.define = define;
exports.Particle = Particle;
