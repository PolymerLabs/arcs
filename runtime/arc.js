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

var runtime = require("./runtime.js");
var assert = require("assert");

class ParticleSlotBase {
  constructor(name, type) {
    this.name = name;
    this.type = type;
  }

  // TODO: we'll probably remove this at some point
  autoconnect(scope) {
    this.connect(scope._viewFor(this.type));
  }

  connect(view) {
    this.view = view;
    if (this._checkpoint !== undefined)
      this.view.checkpoint();
  }

  checkpoint() {
    if (this.view)
      this.view.checkpoint();
  }

  revert() {
    this.view.revert();
  }

  shutdown() {
  }

}

class SingletonParticleSlot extends ParticleSlotBase {
  constructor(name, type) {
    super(name, type);
    this.pending = [];
    this.data = [];
  }

  connect(view) {
    super.connect(view);
    this.rid = view.register(iter => this.pending.push(iter));
  }

  commit(source) {
    this.view.store(source[this.name]);
  }

  checkpoint() {
    this._checkpoint = this.data.length;
    super.checkpoint();
  }

  revert() {
    this.data.splice(this._checkpoint);
    this.pending = [];
    this._checkpoint = undefined;
    super.revert();
  }

  shutdown() {
    if (this.view)
      this.view.unregister(this.rid);
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

class ViewParticleSlot extends ParticleSlotBase {
  constructor(name, type) {
    super(name, type);
    this.checkpointedSize = undefined;
  }
  connect(view) {
    super.connect(view);
    // TODO fix this up with a genuine ability to register for updates
    // on the view. Use that in the SingletonParticleSlot too.
    this.deliveredSize = 0;
  }

  commit(source) {
    source[this.name].map(this.view.store);
  }

  checkpoint() {
    this.checkpointedSize = this.deliveredSize;
    super.checkpoint();
  }

  revert() {
    super.revert();
    this.deliveredSize = this.checkpointedSize;
    this.checkpointedSize = undefined;
  }

  hasPending() {
    return this.deliveredSize < this.view.data.length;
  }

  expandInputs() {
    this.deliveredSize = this.view.data.length;
    return [this.view];
  }

  missingData() {
    return false;
  }

}

function particleSlot(name, type, spec) {
  if (typeof spec == "object")
    return new ViewParticleSlot(name, type);
  return new SingletonParticleSlot(name, type);
}

class ArcParticle {
  constructor(particle, arc) {
    this.particle = particle;
    this.arc = arc;
    particle.arcParticle = this;
    this.inputs = new Map();
    particle.inputs().map(a => this.inputs.set(a.name, particleSlot(a.name, a.type, a.typeName)));
    this.outputs = new Map();
    particle.outputs().map(a => this.outputs.set(a.name, particleSlot(a.name, a.type, a.typeName)));
  }

  checkpoint() {
    this.inputList().forEach(i => i.checkpoint());
    this.outputList().forEach(o => o.checkpoint());
  }

  revert() {
    this.inputList().forEach(i => i.revert());
    this.outputList().forEach(o => o.revert());    
  }

  shutdown() {
    this.inputList().forEach(i => i.shutdown());
    this.outputList().forEach(o => o.shutdown());
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
      return false;

    var pendingInputs = this.inputList().filter(a => a.hasPending());
    if (pendingInputs.length == 0)
      return false;

    var storedDataInputs = this.inputList().filter(a => !a.hasPending());

    let allInputs = {}
    for (let pendingInput of pendingInputs)
      allInputs[pendingInput.name] = pendingInput.expandInputs();
    
    for (let storedDataInput of storedDataInputs)
      allInputs[storedDataInput.name] = storedDataInput.data

    this.runParticle(this.particle, allInputs, Object.keys(allInputs), []);
    return true;
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

  commitData(relevance) {
    this.outputList().map(a => a.commit(this.particle));
    this.arc.updateRelevance(relevance);
  }

  // TODO: we'll probably remove this at some point
  autoconnect() {
    this.inputList().map(a => a.autoconnect(this.arc.scope));
    this.outputList().map(a => a.autoconnect(this.arc.scope));
  }
}


class Arc {
  constructor(scope) {
    assert(scope instanceof runtime.Scope, "Arc constructor requires a scope");
    this.scope = scope;
    this.particles = [];
    this.views = new Map();
    this.checkpointed = false;
    this.temporaryParticles = [];
    this.relevance = 1;
  }

  updateRelevance(relevance) {
    if (relevance == undefined) {
      relevance = 5;
    }
    relevance = Math.max(0, Math.min(relevance, 10));
    // TODO: might want to make this geometric or something instead;
    relevance /= 5;
    this.relevance *= relevance;
  }

  resetRelevance() {
    this.relevance = 1;
  }

  checkpoint() {
    assert(!this.checkpointed);
    this.checkpointed = true;
    this.particles.forEach(p => p.checkpoint());
  }

  revert() {
    assert(this.checkpointed);
    this.checkpointed = false;
    this.temporaryParticles.forEach(p => {p.revert(); p.shutdown()});
    this.temporaryParticles = [];
    this.particles.forEach(p => p.revert());
  }

  register(particle) {
    if (this.checkpointed) {
      var p = new ArcParticle(particle, this);
      p.checkpoint();
      this.temporaryParticles.push(p);
      return;
    }
    this.particles.push(new ArcParticle(particle, this));
  }

  tick() {
    var moreTicks = false;
    for (var particle of this.particles)
      moreTicks |= particle.process();
    for (var particle of this.temporaryParticles)
      moreTicks |= particle.process();
    return moreTicks;
  }

  addView(view) {
    view.arc = this;
    this.views.set(view.type, view);
  }
}

module.exports = Arc;
