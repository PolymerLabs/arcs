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
const Type = require('./type.js');
const view = require('./view.js');
const Relation = require('./relation.js');
var PEC = require('./particle-execution-context.js');

class Arc {
  constructor(scope) {
    assert(scope instanceof runtime.Scope, "Arc constructor requires a scope");
    this.scope = scope;
    this.particles = [];
    this.views = new Set();
    this._viewsByType = new Map();
    this.checkpointed = false;
    this.temporaryParticles = [];
    this._relevance = 1;
    this.particleViewMaps = new Map();
  }

  clone() {
    var arc = new Arc(this.scope.clone());
    var viewMap = new Map();
    this.views.forEach(v => viewMap.set(v, v.clone()));
    arc.particles = this.particles.map(p => p.clone(viewMap));
    for (let v of viewMap.values())
      arc.registerView(v);
    arc._viewMap = viewMap;
    return arc;
  }

  get relevance() {
    this.particles.forEach(p => {
      p.relevances.forEach(r => this.updateRelevance(r));
      p.relevances = [];
    });
    this.temporaryParticles.forEach(p => {
      p.relevances.forEach(r => this.updateRelevance(r));
      p.relevances = [];
    });
    return this._relevance;
  }

  updateRelevance(relevance) {
    if (relevance == undefined) {
      relevance = 5;
    }
    relevance = Math.max(0, Math.min(relevance, 10));
    // TODO: might want to make this geometric or something instead;
    relevance /= 5;
    this._relevance *= relevance;
  }

  resetRelevance() {
    this._relevance = 1;
    this.particles.forEach(p => p.relevances = []);
    this.temporaryParticles.forEach(p => p.relevances = []);
  }

  checkpoint() {
    assert(!this.checkpointed, "checkpoint called on arc, but arc already checkpointed");
    this.checkpointed = true;
    this.particles.forEach(p => {
      var viewMap = this.particleViewMaps.get(p);
      for (var v of viewMap.values())
        v.checkpoint();
    });
  }

  revert() {
    assert(this.checkpointed, "revert called on arc, but arc isn't checkpointed");
    this.checkpointed = false;
    this.temporaryParticles.forEach(p => {
      var viewMap = this.particleViewMaps.get(p);
      for (var v of viewMap.values())
        v.revert();
    });
    this.temporaryParticles = [];
    this.particles.forEach(p => {
      var viewMap = this.particleViewMaps.get(p);
      for (var v of viewMap.values())
        v.revert();
    });
  }

  connectParticleToView(particle, name, view) {
    // If speculatively executing then we need to translate the view
    // in the plan to its clone.
    if (this._viewMap) {
      view = this._viewMap.get(view);
    }
    assert(this.views.has(view), "view of type " + view.type.key + " not visible to arc");
    var viewMap = this.particleViewMaps.get(particle);
    assert(particle.spec.connectionMap.get(name) !== undefined, "can't connect view to a view slot that doesn't exist");
    viewMap.set(name, view);
    if (this.checkpointed)
      view.checkpoint();
    if (viewMap.size == particle.spec.connectionMap.size)
      particle.setViews(viewMap);
  }

  constructParticle(particleClass) {
    var particle = new particleClass(this.scope);
    this.register(particle);
    return particle;
  }

  register(particle) {
    if (this.checkpointed) {
      this.temporaryParticles.push(particle);
    }
    this.particles.push(particle);
    this.particleViewMaps.set(particle, new Map());
  }

  createView(type, name) {
    assert(type instanceof Type, "can't createView with a type that isn't a Type");
    if (type.isRelation)
      type = type.viewOf(this);
    if (type.isView) {
      var v = new view.View(type, this.scope, name);
    } else {
      var v = new view.Variable(type, this.scope, name);
    }
    this.registerView(v);
    return v;
  }

  registerView(view) {
    let views = this.findViews(view.type);
    if (!views.length) {
      this._viewsByType.set(view.type, views);
    }
    views.push(view);

    this.addView(view);
  }

  findViews(type, options) {
    // TODO: use options (location, labels, etc.) somehow.
    return this._viewsByType.get(type) || [];
  }

  addView(view) {
    view.arc = this;
    this.views.add(view);
  }

  _viewFor(type) {
    let views = this.findViews(type);
    if (views.length > 0) {
      return views[0];
    }

    return this.createView(type, "automatically created for _viewFor");
  }

  commit(entities) {
    let entityMap = new Map();
    for (let entity of entities) {
      entityMap.set(entity, this._viewFor(this.scope.typeFor(entity).viewOf(this.scope)));
    }
    for (let entity of entities) {
      if (entity instanceof Relation) {
        entity.entities.forEach(entity => entityMap.set(entity, this._viewFor(this.scope.typeFor(entity).viewOf(this.scope))));
      }
    }
    this.newCommit(entityMap);
  }

  newCommit(entityMap) {
    for (let [entity, view] of entityMap.entries()) {
      entity.identify(view, this.scope);
    }
    for (let [entity, view] of entityMap.entries()) {
      view.store(entity);
    }
  }  
}

module.exports = Arc;
