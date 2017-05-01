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
const PECOuterPort = require('./api-channel.js').PECOuterPort;

class OuterPEC extends PEC {
  constructor(scope, port) {
    super();
    this._scope = scope;
    this._particles = [];
    this._port = port;
    this._apiPort = new PECOuterPort(this._port);
    this._nextIdentifier = 0;
    this._idMap = new Map();
    this._reverseIdMap = new Map();
    var domRoot = global.document ? document.body : {};
    this.slotManager = new SlotManager(domRoot, this);

    this._apiPort.onRenderSlot = ({particle, content}) => {
      this.slotManager.renderSlot(particle, content);
    };

    this._apiPort.onViewOn = ({view, target, callback, type}) => {
      view.on(type, data => this._apiPort.ViewCallback({callback, data}), target);
    };

    this._apiPort.onViewGet = ({view, callback}) => {
      this._apiPort.PromiseResponse({callback, data: view.get()});
    }

    this._apiPort.onViewToList = ({view, callback}) => {
      this._apiPort.PromiseResponse({callback, data: view.toList()});
    }

    this._apiPort.onViewSet = ({view, data}) => view.set(data);
    this._apiPort.onViewStore = ({view, data}) => view.store(data);

    this._apiPort.onIdle = ({version, relevance}) => {
      if (version == this._idleVersion) {
        this._idlePromise = undefined;
        this._idleResolve(relevance);
      }
    }

    this._apiPort.onGetSlot = ({particle, name, callback}) => {
      assert(particle.renderMap.has(name));
      this.slotManager.registerSlot(particle, name, particle.renderMap.get(name)).then(() =>
        this._apiPort.PromiseResponse({callback}));
    }
  }

  _releaseSlot(message) {
    let particleSpec = this._thingForIdentifier(message.particle);
    let affectedParticles = this.slotManager.releaseSlot(particleSpec);
    if (affectedParticles) {
      affectedParticles = affectedParticles.map(p => this._identifierForThing(p));
      this._port.postMessage({messageType: "LostSlots", messageBody: affectedParticles});
    }
  }

  get idle() {
    if (this._idlePromise == undefined) {
      this._idlePromise = new Promise((resolve, reject) => {
        this._idleResolve = resolve;
      });
    }
    this._idleVersion = this._nextIdentifier;
    this._apiPort.AwaitIdle({version: this._nextIdentifier++});
    return this._idlePromise;
  }

  get messageCount() {
    return this._apiPort.messageCount;
  }

  sendEvent(particle, eventName) {
    this._apiPort.UIEvent({particle, eventName})
  }

  instantiate(particle, views, mutateCallback) {
    views.forEach(view => this._apiPort.DefineView(view, {viewType: view.type.toLiteral()}));

    if (particle._isInline) {
      this._apiPort.DefineParticle({
        particleDefinition: particle._inlineDefinition,
        particleFunction: particle._inlineUpdateFunction
      });
    }

    var renderMap = new Map();
    particle.spec.renders.forEach(
      render => renderMap.set(render.name.name, views.get(render.name.view)));

    var exposeMap = new Map();
    particle.spec.exposes.forEach(
      expose => exposeMap.set(expose.name, views.get(expose.view)));
    
    var particleSpec = {particle, views, renderMap, exposeMap }

    this._apiPort.InstantiateParticle(particleSpec, { particleName: particle.name, views })
  }
}

module.exports = OuterPEC;