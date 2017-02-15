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

class CoordinatorView {
  constructor(name, type) {
    this.name = name;
    this.type = type;
    this.pending = [];
    this.data = [];
    data.internals.viewFor(type).register(iter => this.pending.push(iter));
  }

  expandInputs() {
    var newData = [];
    for (let pending of this.pending) {
      while (true) {
        var elem = pending.next().value;
        if (elem == undefined)
          break;
        newData.push(elem);
      }
    }
    this.data = this.data.concat(newData);
    this.pending = [];
    return newData;
  }

  hasPending() {
    return this.pending.length > 0;
  }

  missingData() {
    return (this.pending.length == 0) && (this.data.length == 0);
  }
}

class CoordinatorParticle {
  constructor(particle) {
    this.particle = particle;
    this.inputs = particle.inputs.map(a => new CoordinatorView(a.name, a.type));
  }

  process() {
    var missingInputs = this.inputs.filter(a => a.missingData());
    if (missingInputs.length > 0)
      return;

    var pendingInputs = this.inputs.filter(a => a.hasPending());
    if (pendingInputs.length == 0)
      return;

    var storedDataInputs = this.inputs.filter(a => !a.hasPending());

    let allInputs = {}
    for (let pendingInput of pendingInputs)
      allInputs[pendingInput.name] = pendingInput.expandInputs();
    
    for (let storedDataInput of storedDataInputs)
      allInputs[storedDataInput.name] = storedDataInput.data

    this.runParticle(this.particle, allInputs, Object.keys(allInputs), []);
  }

  runParticle(particle, inputs, inputList, idxs) {
    if (idxs.length == inputList.length) {
      particle.dataUpdated();
      return;
    }
    var thisLevelInputs = inputs[inputList[idxs.length]];
    for (var i = 0; i < thisLevelInputs.length; i++) {
      particle[inputList[idxs.length]] = thisLevelInputs[i];
      this.runParticle(particle, inputs, inputList, idxs.concat([i]));
    }
  }
}


class Coordinator {
  constructor() {
    this.particles = [];
  }

  register(particle) {
    this.particles.push(new CoordinatorParticle(particle));
  }

  tick() {
    for (var particle of this.particles)
      particle.process();
  }
}

exports.Coordinator = Coordinator;
