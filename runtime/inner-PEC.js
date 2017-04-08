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

const Scope = require('./scope.js');
const systemParticles = require('./system-particles.js');
const loader = require('./loader.js');
const Type = require('./type.js');

class InnerPEC {
  constructor(port) {
    this._port = port;
    this._port.onmessage = e => this._handle(e);
    this._scope = new Scope();
    systemParticles.register(this._scope);
    this.particleMap = new Map();
    this._types = new Set();
    this._views = new Map();
  }

  _handle(e) {
    switch (e.data.messageType) {
      case InstantiateParticle:
        this._instantiateParticle(e.data.messageBody);
        return;
      default:
        assert(false);
    }
  }

  constructParticle(clazz) {
    return new clazz(this._scope);
  }

  _instantiateParticle(data) {
    if (!scope.particleRegistered(data.particleName)) {
      var clazz = loader.loadParticle(data.particleName);
      this._scope.registerParticle(clazz);
    }

    for (let type of data.types) {
      if (!this._types.has(type)) {
        this._scope.typeFor(loader.loadEntity(type));
        this._types.add(type);
      }
    }

    // do we need this?
    this.particleMap.set(data.particleIdentifier, data.particleName);

    var particle = this._scope.instantiateParticle(data.particleName, this);

    var viewMap = new Map();

    for (let connectionName in data.views) {
      let {viewIdentifier, viewType} = data.view[connectionName];
      if (!this._views.has(viewIdentifier)) {
        var type = Type.fromLiteral(viewType, this._scope);
        if (type.isView()) {
          var view = new viewlet.View(this._remoteViewFor(viewIdentifier));
        } else {
          var view = new viewlet.Variable(this._remoteVariableFor(viewIdentifier));
        }
        this._views.set(viewIdentifier, view);
      }
      viewMap.set(connectionName, this._views.get(viewIdentifier));
    }

    particle.setViews(viewMap);
  }
}