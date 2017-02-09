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

  setDefinition(definition) {
    this.definition = definition;
    definition.args.forEach(arg => {
      if (arg.direction == "in") {
        // TODO this isn't quite correct. Need to manage updates better, have notion
        // of combinatorial set or something.
        data.viewFor(arg.type).register(d => this.useIterator(d, arg.name));
      }
    });
  }

  useIterator(iter, name) {
    // this is wrong! Probably won't have useIterator on Particle directly once
    // the coordinator is implemented. Specifically, this doesn't deal properly
    // with more than a single piece of data in the iterator.
    this[name] = iter.next();
  }

  commitData() {
    this.definition.args.forEach(arg => {
      if (arg.direction == "out")
        data.viewFor(arg.type).store(this[arg.name]);
    }); 
  }

}

exports.Particle = Particle;
