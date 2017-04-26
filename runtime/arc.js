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
let viewlet = require('./viewlet.js');
const InnerPEC = require('./inner-PEC.js');
const MessageChannel = require('./message-channel.js');
const SlotManager = require('./slot-manager.js');

class OuterPEC extends PEC {
  constructor(scope, port) {
    super();
    this._scope = scope;
    this._particles = [];
    this._port = port;
    this._port.onmessage = e => this._handle(e);
    this._nextIdentifier = 0;
    this._idMap = new Map();
    this._reverseIdMap = new Map();
    this.messageCount = 0;
    SlotManager._pec = this;
  }

  get idle() {
    if (this._idlePromise == undefined) {
      this._idlePromise = new Promise((resolve, reject) => {
        this._idleResolve = resolve;
      });
    }
    this._idleVersion = this._nextIdentifier;
    this._port.postMessage({
      messageType: "AwaitIdle",
      messageBody: {version: this._nextIdentifier++}
    });
    return this._idlePromise;
  }

  _idle(message) {
    if (message.version == this._idleVersion) {
      this._idlePromise = undefined;
      this._idleResolve(message.relevance);
    }
  }

  _identifierForThing(thing) {
    if (!this._reverseIdMap.has(thing)) {
      this._idMap.set(this._nextIdentifier, thing);
      this._reverseIdMap.set(thing, this._nextIdentifier++);
    }
    return this._reverseIdMap.get(thing);
  }

  _thingForIdentifier(id) {
    return this._idMap.get(id);
  }

  _renderSlot({particle, content}) {
    SlotManager.renderSlot(this._thingForIdentifier(particle), content);
  }

  _handle(e) {
    this.messageCount++;
    switch (e.data.messageType) {
      case "RenderSlot":
        this._renderSlot(e.data.messageBody);
        return;
      case "ViewOn":
        this._viewOn(e.data.messageBody);
        return;
      case "ViewGet":
        this._viewRetrieve(e.data.messageBody, "ViewGetResponse", v => v.get());
        return;
      case "ViewSet":
        this._viewSave(e.data.messageBody, (v, d) => v.set(d));
        return;
      case "ViewStore":
        this._viewSave(e.data.messageBody, (v, d) => v.store(d));
        return;
      case "ViewToList":
        this._viewRetrieve(e.data.messageBody, "ViewToListResponse", v => v.toList());
        return;
      case "Idle":
        this._idle(e.data.messageBody);
        return;
      case "GetSlot":
        this._getSlot(e.data.messageBody);
        return;
      case "ReleaseSlot":
        this._releaseSlot(e.data.messageBody);
        return;
      default:
        assert(false, "don't know how to handle message of type " + e.data.messageType);
    }
  }

  _getSlot(message) {
    var particleSpec = this._thingForIdentifier(message.particle);
    assert(particleSpec.renderMap.has(message.name));
    SlotManager.registerSlot(particleSpec, message.name, particleSpec.renderMap.get(message.name)).then(() => {
      this._port.postMessage({messageType: "HaveASlot", messageBody: { callback: message.callback }});
    });
  }

  _releaseSlot(message) {
    let particleSpec = this._thingForIdentifier(message.particle);
    let affectedParticles = SlotManager.releaseSlot(particleSpec);
    if (affectedParticles) {
      affectedParticles = affectedParticles.map(p => this._identifierForThing(p));
      this._port.postMessage({messageType: "LostSlots", messageBody: affectedParticles});
    }
  }

  _viewOn(message) {
    var view = this._thingForIdentifier(message.view);    
    view.on(message.type, e => this._forwardCallback(message.callback, e), this._thingForIdentifier(message.target));
  }

  _viewRetrieve(message, messageType, f) {
    var view = this._thingForIdentifier(message.view);
    this._port.postMessage({
      messageType,
      messageBody: {
        callback: message.callback,
        data: f(view)
      }
    });
  }

  _viewSave(message, f) {
    var view = this._thingForIdentifier(message.view);
    f(view, message.data);
  }

  _forwardCallback(cid, e) {
    this._port.postMessage({
      messageType: "ViewCallback",
      messageBody: {
        callback: cid,
        data: e
      }
    });
  }

  sendEvent(particleSpec, eventName) {
    var particle = this._identifierForThing(particleSpec);
    this._port.postMessage({messageType: "UIEvent", messageBody: { particle, eventName }});
  }

  instantiate(particle, views, mutateCallback) {

    var serializedViewMap = {};
    var types = new Set();
    for (let [name, view] of views.entries()) {
      serializedViewMap[name] = { viewIdentifier: this._identifierForThing(view), viewType: view.type.toLiteral() };
      types.add(view.type.toLiteral());
    }

    if (particle._isInline) {
      this._port.postMessage({
        messageType: "DefineParticle",
        messageBody: {
          particleDefinition: particle._inlineDefinition,
          particleFunction: particle._inlineUpdateFunction.toString()
        }
      })
    }

    var renders = particle.spec.renders;
    var renderMap = new Map();
    for (var render of renders) {
      renderMap.set(render.name.name, views.get(render.name.view));
    }

    var exposes = particle.spec.exposes;
    var exposeMap = new Map();
    for (var expose of exposes) {
      exposeMap.set(expose.name, views.get(expose.view));
    }

    var particleSpec = {particle, views, renderMap, exposeMap }

    this._port.postMessage({
      messageType: "InstantiateParticle",
      messageBody: {
        particleName: particle.name,
        particleIdentifier: this._identifierForThing(particleSpec),
        types: [...types.values()],
        views: serializedViewMap
      }
    });
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
    var channel = new MessageChannel();
    this.pec = new OuterPEC(scope, channel.port2);
    this._innerPEC = new InnerPEC(channel.port1);
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

  relevanceFor(rMap) {
    let relevance = 1;
    for (let rList of rMap.values()) {
      for (let r of rList)
        relevance *= Arc.scaleRelevance(r);
    }
    return relevance;
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
      var particle = this.pec.instantiate(viewMap.clazz, viewMap.views)
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
      new viewlet.viewletFor(view).store(entity);
    }
  }  
}

module.exports = Arc;
