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

class ParticleSlot {
  constructor(name, type) {
    this.name = name;
    this.type = type;
    this.pending = [];
    this.data = [];
  }

  // TODO: we'll probably remove this at some point
  autoconnect() {
    this.connect(data.internals.viewFor(this.type));
  }

  connect(view) {
    this.view = view;
    view.register(iter => this.pending.push(iter));
  }

  commit(source) {
    this.view.store(source[this.name]);
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

class ArcParticle {
  constructor(particle) {
    this.particle = particle;
    particle.arcParticle = this;
    this.inputs = new Map();
    particle.inputs.map(a => this.inputs.set(a.name, new ParticleSlot(a.name, a.type)));
    this.outputs = new Map();
    particle.outputs.map(a => this.outputs.set(a.name, new ParticleSlot(a.name, a.type)));
  }

  inputList() {
    return Array.from(this.inputs.values());
  }

  outputList() {
    return Array.from(this.outputs.values());
  }

  process() {
    var missingInputs = this.inputList().filter(a => a.missingData());
    if (missingInputs.length > 0)
      return;

    var pendingInputs = this.inputList().filter(a => a.hasPending());
    if (pendingInputs.length == 0)
      return;

    var storedDataInputs = this.inputList().filter(a => !a.hasPending());

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

  commitData() {
    this.outputList().map(a => a.commit(this.particle));
  }

  // TODO: we'll probably remove this at some point
  autoconnect() {
    this.inputList().map(a => a.autoconnect());
    this.outputList().map(a => a.autoconnect());
  }
}


class Arc {
  constructor() {
    this.particles = [];
    this.views = new Map();
  }

  register(particle) {
    this.particles.push(new ArcParticle(particle));
  }

  tick() {
    for (var particle of this.particles)
      particle.process();
  }

  addView(view) {
    view.arc = this;
    this.views.set(view.type, view);
  }
}

module.exports = Arc;
