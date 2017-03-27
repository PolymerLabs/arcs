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
    setViews(views) {
      var inputViews = new Map();
      for (let input of this.inputs()) {
        views.get(input.name).on('change', e => {
            var relevance = update(views, e);
            if (relevance !== undefined)
              this.relevance = relevance;
        });
      }
    }
  };
}

class Particle {
  constructor(arc) {
    this.arc = arc;
    this.spec = this.constructor.spec.resolve(arc.scope);
    if (this.spec.inputs.length == 0)
      this.extraData = true;
    arc.register(this);
  }

  // Override this to do stuff
  setViews(views) {

  }

  // Override this to do stuff
  dataUpdated() {
  }

  commitData(relevance) {
    this.arcParticle.commitData(relevance);
  }

  checkpoint() {
    this.spec.connections.forEach(c => c.view.checkpoint());
  }

  revert() {
    this.spec.connections.forEach(c => c.view.revert());
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
