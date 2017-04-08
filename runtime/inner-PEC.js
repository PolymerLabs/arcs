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
const testEntities = require('./test/test-entities.js');
const loader = require('./loader.js');
const Type = require('./type.js');
const viewlet = require('./viewlet.js');
const define = require('./particle.js').define;
const assert = require('assert');

class InnerPEC {
  constructor(port) {
    this._port = port;
    this._port.onmessage = e => this._handle(e);
    this._scope = new Scope();
    // TODO: really should have a nicer approach for loading
    // default particles & types.
    testEntities.register(this._scope);
    this.particleMap = new Map();
    this._views = new Map();
  }

  _handle(e) {
    switch (e.data.messageType) {
      case "InstantiateParticle":
        this._instantiateParticle(e.data.messageBody);
        return;
      case "DefineParticle":
        this._defineParticle(e.data.messageBody);
        return;
      default:
        assert(false, "Don't know how to handle messages of type". e.data.messageType);
    }
  }

  _defineParticle(data) {
    var particle = define(data.particleDefinition, eval(data.particleUpdateFunction));
    this._scope.registerParticle(particle);
  }

  constructParticle(clazz) {
    return new clazz(this._scope);
  }

  _remoteViewFor(id) {
    return {
      on: function() { console.log('on', arguments); },
      store: function() { console.log('store', arguments); },
      toList: function() { console.log('toList', arguments); }
    }
  }

  _remoteVariableFor(id) {
    return {
      on: function() { console.log('on', arguments); },
      get: function() { console.log('get', arguments); },
      set: function() { console.log('set', arguments); }
    }
  }

  _instantiateParticle(data) {
    if (!this._scope.particleRegistered(data.particleName)) {
      var clazz = loader.loadParticle(data.particleName);
      this._scope.registerParticle(clazz);
    }

    for (let type of data.types) {
      // TODO: This is a dodgy hack based on possibly unintended
      // behavior in Type's constructor.
      if (!this._scope._types.has(JSON.stringify(type))) {
        this._scope.typeFor(loader.loadEntity(type));
        this._types.add(type);
      }
    }

    // do we need this?
    this.particleMap.set(data.particleIdentifier, data.particleName);

    var particle = this._scope.instantiateParticle(data.particleName, this);

    var viewMap = new Map();

    for (let connectionName in data.views) {
      let {viewIdentifier, viewType} = data.views[connectionName];
      if (!this._views.has(viewIdentifier)) {
        var type = Type.fromLiteral(viewType, this._scope);
        if (type.isView) {
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

module.exports = InnerPEC;