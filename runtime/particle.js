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
<<<<<<< HEAD
var runtime = require("./runtime.js");
=======
var data = require("./data-layer.js");
var ParticleSpec = require("./particle-spec.js");
>>>>>>> Allow recipes to suspend resolution of types.

function define(def, update) {
  let definition = parser.parse(def);
  return class extends Particle {
    static get definition() {
      return definition;
    }
    static get name() {
      return this.definition.type;
    }
    constructor(arc) {
      super(arc);
    }
    dataUpdated() {
      let inputs = {};
      for (let input of this.inputs) {
        inputs[input.name] = this[input.name];
      }
      Object.assign(this, update(inputs));
      this.commitData(this.relevance);
    }
  };
}

class Particle {
  constructor(arc) {
    this.arc = arc;
    this.constructor.definition && this.setDefinition(this.constructor.definition);
  }

  setDefinition(definition) {
    this.definition = new ParticleSpec(definition);
    this.definition.resolve(this.arc.scope);
    this.arc.register(this);
  }

  // Override this to do stuff
  dataUpdated() {
  }

  commitData(relevance) {
    this.arcParticle.commitData(relevance);
  }

  inputs() {
    return this.definition.inputs;
  }

  outputs() {
    return this.definition.outputs;
  }

}

exports.define = define;
exports.Particle = Particle;
