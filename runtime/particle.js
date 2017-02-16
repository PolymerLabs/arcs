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

var data = require("./data-layer.js");

class Particle {
  constructor(arc) {
    this.arc = arc;
    this.inputs = [];
  }

  setDefinition(definition) {
    definition.args = definition.args.map(a => { return {direction: a.direction, name: a.name, type: new data.internals.Type(a.type)}});
    this.definition = definition;
    definition.args.forEach(arg => {
      if (arg.direction == "in") {
        // TODO this isn't quite correct. Need to manage updates better, have notion
        // of combinatorial set or something.
        this.inputs.push(arg);
      }
    });
    this.arc.register(this);
  }

  commitData() {
    this.definition.args.forEach(arg => {
      if (arg.direction == "out")
        data.internals.viewFor(arg.type).store(this[arg.name]);
    });
  }

}

exports.Particle = Particle;
