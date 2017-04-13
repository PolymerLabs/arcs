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
let viewlet = require('./viewlet');

class LocalPEC extends PEC {
  constructor(scope) {
    super();
    this._scope = scope;
    this._particles = [];
  }

  instantiate(particle, views, mutateCallback) {
    var p = new particle(this._scope);
    p.setViews(views);
    this._particles.push(p);
    return p;
  }
  get relevance() {
    var rMap = new Map();
    this._particles.forEach(p => { rMap.set(p, p.relevances); p.relevances = []; });
    return Promise.resolve(rMap);
  }
  get busy() {
    for (let particle of this._particles) {
      if (particle.busy) {
        return true;
      }
    }
    return false;
  }
  get idle() {
    if (!this.busy) {
      return Promise.resolve();
    }
    return Promise.all(this._particles.map(particle => particle.idle)).then(() => this.idle);
  }
}

class Arc {
  constructor(scope) {
    assert(scope instanceof runtime.Scope, "Arc constructor requires a scope");
    this.scope = scope;
    this.particles = [];
    this.views = new Set();
    this._viewsByType = new Map();
    this.particleViewMaps = new Map();
    this.pec = new LocalPEC(scope);
    this.nextParticleHandle = 0;
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
    return this.pec.relevance.then(rMap => {
      let relevance = 1;
      for (let rList of rMap.values())
        for (let r of rList)
          relevance *= Arc.scaleRelevance(r);
      return relevance;
    });
  }

  static scaleRelevance(relevance) {
    if (relevance == undefined) {
      relevance = 5;
    }
    relevance = Math.max(0, Math.min(relevance, 10));
    // TODO: might want to make this geometric or something instead;
    return relevance / 5;
  }

  connectParticleToView(particle, name, targetView) {
    // If speculatively executing then we need to translate the view
    // in the plan to its clone.
    if (this._viewMap) {
      targetView = this._viewMap.get(targetView);
    }
    assert(this.views.has(targetView), "view of type " + targetView.type.key + " not visible to arc");
    var viewMap = this.particleViewMaps.get(particle);
    assert(viewMap.clazz.spec.connectionMap.get(name) !== undefined, "can't connect view to a view slot that doesn't exist");
    viewMap.views.set(name, targetView);
    if (viewMap.views.size == viewMap.clazz.spec.connectionMap.size) {
      let viewletMap = new Map(Array.from(viewMap.views.entries()).map(([key, value]) => {
        if (value instanceof view.Variable) {
          value = new viewlet.Variable(value);
        } else {
          value = new viewlet.View(value);
        }
        return [key, value];
      }));
      var particle = this.pec.instantiate(viewMap.clazz, viewletMap)
      this.particles.push(particle);
    } 
  }

  constructParticle(particleClass) {
    var handle = this.nextParticleHandle++;
    this.particleViewMaps.set(handle, {clazz: particleClass, views: new Map()});
    return handle;
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
      new viewlet.View(view).store(entity);
    }
  }  
}

module.exports = Arc;
