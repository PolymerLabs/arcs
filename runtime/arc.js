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
var tracing = require("tracelib");
const Type = require('./type.js');
const view = require('./view.js');
const Relation = require('./relation.js');
let viewlet = require('./viewlet.js');
const OuterPec = require('./outer-PEC.js');

class Arc {
  constructor({id, loader, pecFactory, slotComposer}) {
    assert(loader);
    this._loader = loader;
    // TODO: pecFactory should not be optional. update all callers and fix here.
    this._pecFactory = pecFactory ||  require('./fake-pec-factory').bind(null);
    this.id = id;
    this.nextLocalID = 0;
    this.particles = [];

    // All the views, mapped by view ID
    this._viewsById = new Map();
    // .. and mapped by Type
    this._viewsByType = new Map();

    // information about last-seen-versions of views
    this._lastSeenVersion = new Map();

    this.particleViewMaps = new Map();
    let pecId = this.generateID();
    let innerPecPort = this._pecFactory(pecId);
    this.pec = new OuterPec(innerPecPort, slotComposer, `${pecId}:outer`);
    this.nextParticleHandle = 0;
  }
  
  static deserialize({serialization, pecFactory, loader, slotComposer, arcMap}) {
    var entityMap = {};
    var viewMap = {};
    serialization.entities.forEach(e => entityMap[e.id] = e);
    var arc = new Arc({id: serialization.id, loader, slotComposer});
    for (var serializedView of serialization.views) {
      if (serializedView.arc) {
        var view = arcMap.get(serializedView.arc).viewById(serializedView.id);
        arc.mapView(view);
      } else {
        // TODO add a separate deserialize constructor for view?
        var view = arc.createView(new Type(serializedView.type), serializedView.name, serializedView.id);
        view._version = serializedView.version;

        if (serializedView.sort == 'view') {
          var values = serializedView.values.map(a => entityMap[a]);
          values.forEach(v => view._items.set(v.id, v));
        } else {
          var value = entityMap[serializedView.value];
          view._stored = value;
        }
      }
      viewMap[view.id] = view;
      arc._lastSeenVersion.set(view.id, serializedView.version);
    }
    for (var serializedParticle of serialization.particles) {
      var particle = arc.instantiateParticle(serializedParticle.name);
      for (var name in serializedParticle.views) {
        arc.connectParticleToView(particle, name, viewMap[serializedParticle.views[name]]);
      }
    }
    return arc;
  }

  instantiateParticle(name) {
    let particleClass = this._loader.loadParticle(name, true);
    assert(particleClass, `can't find particle ${name}`);
    var handle = this.nextParticleHandle++;
    this.particleViewMaps.set(handle, {clazz: particleClass, views: new Map()});
    return handle;
  }

  particleSpec(name) {
    return this._loader.loadParticleSpec(name);
  }

  generateID() {
    return `${this.id}:${this.nextLocalID++}`;
  }

  get _views() {
    return [...this._viewsById.values()];
  }

  clone() {
    var arc = new Arc({loader: this._loader, id: this.generateID(), pecFactory: this._pecFactory});
    var viewMap = new Map();
    this._views.forEach(v => viewMap.set(v, v.clone()));
    arc.particles = this.particles.map(p => p.clone(viewMap));
    for (let v of viewMap.values())
      arc.registerView(v);
    arc._viewMap = viewMap;
    return arc;
  }    

  serialize() {
    var s = { views: [], particles: [], id: this.id };

    // 1. serialize entities
    var entities = new Set();
    for (var view of this._views)
      view.extractEntities(entities);

    s.entities = [...entities.values()];

    // 2. serialize views
    for (var view of this._views) {
      if (view._arc !== this) {
        view.serializeMappingRecord(s.views);
      } else {
        view.serialize(s.views);
      }
    }

    // 3. serialize particles
    for (var particle of this.particleViewMaps.values()) {
      if (particle.clazz.spec.transient)
        continue;
      var name = particle.clazz.name;
      var serializedParticle = { name, views: {}};
      for (let [key, value] of particle.views) {
        serializedParticle.views[key] = value.id;
      }
      s.particles.push(serializedParticle);
    }
    return s;
  }

  connectParticleToView(particle, name, targetView) {
    // If speculatively executing then we need to translate the view
    // in the plan to its clone.
    if (this._viewMap) {
      targetView = this._viewMap.get(targetView) || targetView;
    }
    assert(targetView, "no target view provided");
    assert(this._viewsById.has(targetView.id), "view of type " + targetView.type.key + " not visible to arc");
    var viewMap = this.particleViewMaps.get(particle);
    assert(viewMap.clazz.spec.connectionMap.get(name) !== undefined, "can't connect view to a view slot that doesn't exist");
    viewMap.views.set(name, targetView);
    if (viewMap.views.size == viewMap.clazz.spec.connectionMap.size) {
      var particle = this.pec.instantiate(viewMap.clazz, viewMap.views, this._lastSeenVersion);
      this.particles.push(particle);
    } 
  }

  createView(type, name, id) {
    assert(type instanceof Type, "can't createView with a type that isn't a Type");
    if (type.isRelation)
      type = type.viewOf(this);
    if (type.isView) {
      var v = new view.View(type, this, name, id);
    } else {
      var v = new view.Variable(type, this, name, id);
    }
    this.registerView(v);
    return v;
  }

  mapView(view) {
    this.registerView(view);
  }

  registerView(view) {
    let views = this.findViews(view.type);
    if (!views.length) {
      this._viewsByType.set(JSON.stringify(view.type.toLiteral()), views);
    }
    views.push(view);

    this.addView(view);
  }

  findViews(type, options) {
    // TODO: use options (location, labels, etc.) somehow.
    return this._viewsByType.get(JSON.stringify(type.toLiteral())) || [];
  }

  viewById(id) {
    return this._viewsById.get(id);
  }

  addView(view) {
    this._viewsById.set(view.id, view);
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
      entityMap.set(entity, this._viewFor(entity.constructor.type.viewOf()));
    }
    for (let entity of entities) {
      if (entity instanceof Relation) {
        entity.entities.forEach(entity => entityMap.set(entity, this._viewFor(entity.constructor.type.viewOf())));
      }
    }
    this.newCommit(entityMap);
  }

  newCommit(entityMap) {
    for (let [entity, view] of entityMap.entries()) {
      entity.identify(this.generateID());
    }
    for (let [entity, view] of entityMap.entries()) {
      new viewlet.viewletFor(view).store(entity);
    }
  }  
}

module.exports = Arc;
