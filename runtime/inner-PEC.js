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
const typeLiteral = require('./type-literal.js');

class InnerPEC {
  constructor(port) {
    this._port = port;
    this._port.onmessage = e => this._handle(e);
    this._scope = new Scope();
    // TODO: really should have a nicer approach for loading
    // default particles & types.
    testEntities.register(this._scope);
    this._views = new Map();
    this._reverseIdMap = new Map();
    this._idMap = new Map();
  }

  _establishThingMapping(id, thing) {
    this._reverseIdMap.set(thing, id);
    this._idMap.set(id, thing);
  }

  _identifierForThing(thing) {
    return this._reverseIdMap.get(thing);
  }

  _thingForIdentifier(id) {
    return this._idMap.get(id);
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

  _remoteViewFor(id, isView) {
    var v = this._thingForIdentifier(id);
    if (v == undefined) {
      if (isView) {
        v = {
          on: function() { console.log('on', arguments); },
          store: function() { console.log('store', arguments); },
          toList: function() { console.log('toList', arguments); }
        }
      } else {
        v = {
          on: function() { console.log('on', arguments); },
          get: function() { console.log('get', arguments); },
          set: function() { console.log('set', arguments); }
        }
      }
      this._establishThingMapping(id, v);
    }
    if (isView) {
      return new viewlet.View(v);
    }
    return new viewlet.Variable(v);
  }

  _remoteVariableFor(id) {
    var viewlet = this._thingForIdentifier(id);
    if (viewlet == undefined) {
      this._establishThingMapping(id, viewlet);
    }
    return viewlet;      
  }

  _instantiateParticle(data) {
    if (!this._scope.particleRegistered(data.particleName)) {
      var clazz = loader.loadParticle(data.particleName);
      this._scope.registerParticle(clazz);
    }


    for (let type of data.types) {
      /*
       * This section ensures that the relevant types are known
       * in the scope object, because otherwise we can't do
       * particleSpec resolution, which is currently a necessary
       * part of particle construction.
       *
       * Possibly we should eventually consider having particle
       * specifications separated from particle classes - and
       * only keeping type information on the arc side.
       */
      if (typeLiteral.isView(type)) {
        type = typeLiteral.primitiveType(type);
      }
      // TODO: This is a dodgy hack based on possibly unintended
      // behavior in Type's constructor.
      if (!this._scope._types.has(JSON.stringify(type))) {
        this._scope.typeFor(loader.loadEntity(type));
      }
    }

    this._establishThingMapping(data.particleIdentifier, data.particleName);

    var particle = this._scope.instantiateParticle(data.particleName, this);

    var viewMap = new Map();

    for (let connectionName in data.views) {
      let {viewIdentifier, viewType} = data.views[connectionName];
      let type = Type.fromLiteral(viewType, this._scope);
      var view = this._remoteViewFor(viewIdentifier, type.isView);
      viewMap.set(connectionName, view);
    }

    particle.setViews(viewMap);
  }
}

module.exports = InnerPEC;