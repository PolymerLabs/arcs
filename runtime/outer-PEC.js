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
const assert = require('assert');
const PECOuterPort = require('./api-channel.js').PECOuterPort;

class OuterPEC extends PEC {
  constructor(port, slotComposer) {
    super();
    this._particles = [];
    this._apiPort = new PECOuterPort(port);
    this._nextIdentifier = 0;
    this._idMap = new Map();
    this._reverseIdMap = new Map();
    this.slotComposer = slotComposer;

    this._apiPort.onRender = ({particle, slotName, content}) => {
      if (this.slotComposer) {
        this.slotComposer.renderSlot(particle, slotName, content);
      }
    }

    this._apiPort.onSynchronize = ({view, target, callback, modelCallback, type}) => {
      if (view.constructor.name == 'Variable') {
        var model = view.get();
      } else {
        var model = view.toList();
      }
      this._apiPort.ViewCallback({callback: modelCallback, data: model}, target);
      view.on(type, data => this._apiPort.ViewCallback({callback, data}), target);
    };

    this._apiPort.onViewGet = ({view, callback}) => {
      this._apiPort.ViewCallback({callback, data: view.get()});
    }

    this._apiPort.onViewToList = ({view, callback}) => {
      this._apiPort.ViewCallback({callback, data: view.toList()});
    }

    this._apiPort.onViewSet = ({view, data}) => view.set(data);
    this._apiPort.onViewStore = ({view, data}) => view.store(data);
    this._apiPort.onViewClear = ({view}) => view.clear();

    this._apiPort.onIdle = ({version, relevance}) => {
      if (version == this._idleVersion) {
        this._idlePromise = undefined;
        this._idleResolve(relevance);
      }
    }
  }

  stop() {
    this._apiPort.Stop();
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

  sendEvent(particle, slotName, event) {
    this._apiPort.UIEvent({particle, slotName, event})
  }

  instantiate(particleSpec, spec, views, lastSeenVersion) {
    views.forEach(view => {
      var version = lastSeenVersion.get(view.id) || 0;
      this._apiPort.DefineView(view, { viewType: view.type.toLiteral(), name: view.name,
                                       version });
    });

    // TODO: Can we just always define the particle and map a handle for use in later
    //       calls to InstantiateParticle?
    if (spec._model._isInline) {
      this._apiPort.DefineParticle({
        particleDefinition: spec._model._inlineDefinition,
        particleFunction: spec._model._inlineUpdateFunction
      });
    }

    // TODO: rename this concept to something like instantiatedParticle, handle or registration.
    this._apiPort.InstantiateParticle(particleSpec, {spec, views});
    return particleSpec;
  }
  startRender({particle, slotName, contentTypes}) {
    this._apiPort.StartRender({particle, slotName, contentTypes});
  }
  stopRender({particle, slotName}) {
    this._apiPort.StopRender({particle, slotName});
  }
}

module.exports = OuterPEC;
