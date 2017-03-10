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
var data = require("./data-layer.js");

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
      let outputs = update(inputs);
      Object.assign(this, update(inputs));
      this.commitData(this.relevance);
    }
  };
}

class Particle {
  constructor(arc) {
    this.arc = arc;
    this.inputs = [];
    this.outputs = [];
    this.constructor.definition && this.setDefinition(this.constructor.definition);
  }

  setDefinition(definition) {
    definition.args = definition.args.map(a => { return {direction: a.direction, name: a.name, type: new data.internals.Type(a.type, this.arc.scope)}});
    this.definition = definition;
    definition.args.forEach(arg => {
      if (arg.direction == "in") {
        this.inputs.push(arg);
      }
      else if (arg.direction == "out" || arg.direction == "create") {
        this.outputs.push(arg);
      }
    });
    this.arc.register(this);
  }

  // Override this to do stuff
  dataUpdated() {
  }

  commitData(relevance) {
    this.arcParticle.commitData(relevance);
  }

}

exports.define = define;
exports.Particle = Particle;
