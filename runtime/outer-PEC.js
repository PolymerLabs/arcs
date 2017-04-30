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

const PEC = require('./particle-execution-context.js');
const SlotManager = require('./slot-manager.js');
const assert = require('assert');

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
    var domRoot = global.document ? document.body : {};
    this.slotManager = new SlotManager(domRoot, this);
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
    this.slotManager.renderSlot(this._thingForIdentifier(particle), content);
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
    this.slotManager.registerSlot(particleSpec, message.name, particleSpec.renderMap.get(message.name)).then(() => {
      this._port.postMessage({messageType: "HaveASlot", messageBody: { callback: message.callback }});
    });
  }

  _releaseSlot(message) {
    let particleSpec = this._thingForIdentifier(message.particle);
    let affectedParticles = this.slotManager.releaseSlot(particleSpec);
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

module.exports = OuterPEC;