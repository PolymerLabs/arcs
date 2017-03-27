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

class Arc {
  constructor(scope) {
    assert(scope instanceof runtime.Scope, "Arc constructor requires a scope");
    this.scope = scope;
    this.particles = [];
    this.views = new Map();
    this.checkpointed = false;
    this.temporaryParticles = [];
    this.relevance = 1;
    this.particleViewMaps = new Map();
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

  connectParticleToView(particle, name, view) {
    var viewMap = this.particleViewMaps.get(particle);
    assert(particle.connections[name] !== undefined);
    viewMap.set(name, view);
    if (viewMap.keys().length == Object.keys(particle.connections).length)
      particle.setViews(viewMap);
  }

  register(particle) {
    if (this.checkpointed) {
      this.temporaryParticles.push(particle);
    }
    this.particles.push(particle);
    this.particleViewMaps.set(particle, new Map());
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
