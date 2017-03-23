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
var tracing = require("../tracelib/trace.js");

class ParticleSlotBase {
  constructor(name, type) {
    this.name = name;
    this.type = type;
    this._checkpointed = false;
  }

  // TODO: we'll probably remove this at some point
  autoconnect(scope) {
    this.connect(scope._viewFor(this.type));
  }

  connect(view) {
    this.view = view;
    if (this._checkpointed)
      this.view.checkpoint();
  }

  checkpoint() {
    this._checkpointed = true;
    if (this.view)
      this.view.checkpoint();
  }

  revert() {
    this._checkpointed = false;
    this.view.revert();
  }

  shutdown() {
  }

}

class SingletonParticleSlot extends ParticleSlotBase {
  constructor(name, type) {
    super(name, type);
    this.data = undefined;
    this.pending = undefined;
  }

  connect(view) {
    super.connect(view);
    this.rid = view.register(iter => this.pending = iter);
  }

  commit(source) {
    this._flow = tracing.flow({cat: "arc", name: "commit"}).start();    
    assert(source[this.name] !== undefined);
    this.outData = source[this.name];
  }

  writeback(writeMap) {
    if (this._flow) {
      this._flow.end();
      this._flow = undefined;
    }
    if (this.outData == undefined)
      return;
    writeMap.set(this.outData, this.view);
    this.outData = undefined;
  }

  checkpoint() {
    this._checkpoint = this.data;
    super.checkpoint();
  }

  revert() {
    this.data = this._checkpoint;
    this._checkpoint = undefined;
    this.pending = undefined;
    super.revert();
  }

  shutdown() {
    if (this.view)
      this.view.unregister(this.rid);
  }

  applyInputs() {
    this.data = this.pending;
    this.pending = undefined;
    return this.data;
  }

  hasPending() {
    return this.pending !== undefined;
  }

  missingData() {
    return (this.pending == undefined) && (this.data == undefined);
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

  get data() {
    return this.view;
  }

  commit(source) {
    this._flow = tracing.flow({cat: "arc", name: "commit"}).start();
    this.outData = source[this.name];
  }

  writeback(writeMap) {
    if (this._flow) {
      this._flow.end();
      this._flow = undefined;
    }
    if (this.outData !== undefined)
      this.outData.map(data => {assert(data !== undefined, this.name + " has undefined output data"); writeMap.set(data, this.view)});
    this.outData = undefined;
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

  applyInputs() {
    this.deliveredSize = this.view.data.length;
    return this.view;
  }

  missingData() {
    return false;
  }

}

function particleSlot(name, type, scope) {
  if (type.isView)
    return new ViewParticleSlot(name, type);
  return new SingletonParticleSlot(name, type);
}

class ArcParticle {
  constructor(particle, arc) {
    this.particle = particle;
    this.arc = arc;
    particle.arcParticle = this;
    this.inputs = new Map();
    particle.inputs().map(a => this.inputs.set(a.name, particleSlot(a.name, a.type, arc.scope)));
    this.outputs = new Map();
    particle.outputs().map(a => this.outputs.set(a.name, particleSlot(a.name, a.type, arc.scope)));
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
    var trace = tracing.start({cat: "arc", name: "ArcParticle::process " + this.particle.constructor.name});
    if (this.particle.extraData == true) {
      this.particle.dataUpdated(true);
      trace.end({args: {reason: "generator", processed: true}});
      return true;
    }

    var missingInputs = this.inputList().filter(a => a.missingData());
    if (missingInputs.length > 0) {
      trace.end({args: {reason: "missing inputs", missingInputs: missingInputs.length, processed: false}});
      return false;
    }

    var pendingInputs = this.inputList().filter(a => a.hasPending());
    if (pendingInputs.length == 0) {
      trace.end({args: {reason: "no pending inputs", processed: false}});
      return false;
    }

    var storedDataInputs = this.inputList().filter(a => !a.hasPending());

    let allInputs = {}
    for (let pendingInput of pendingInputs)
      this.particle[pendingInput.name] = pendingInput.applyInputs();
    
    for (let storedDataInput of storedDataInputs)
      this.particle[storedDataInput.name] = storedDataInput.data

    this.particle.dataUpdated();
    trace.end({args: {pendingInputs: pendingInputs.length, storedDataInputs: storedDataInputs.length, processed: true}});
    return true;
  }

  commitData(relevance) {
    this.outputList().map(a => a.commit(this.particle));
    this.arc.updateRelevance(relevance);
  }

  writeback(writeMap) {
    this.outputList().forEach(a => a.writeback(writeMap));
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
    var trace = tracing.start({cat: "arc", name: "Arc::tick"})
    var executedParticles = this.particles.filter(p => p.process());
    executedParticles = executedParticles.concat(this.temporaryParticles.filter(p => p.process()));
    var writebackTrace = tracing.start({cat: "arc", name: "writeback phase"});
    let writeMap = new Map();
    executedParticles.map(p => p.writeback(writeMap));
    this.scope.newCommit(writeMap);
    writebackTrace.end();
    trace.end({args: {executedParticles: executedParticles.length}});
    return executedParticles.length > 0;
  }

  addView(view) {
    view.arc = this;
    this.views.set(view.type, view);
  }
}

module.exports = Arc;
