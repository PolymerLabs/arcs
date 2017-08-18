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

const Type = require('./type.js');
const viewlet = require('./viewlet.js');
const define = require('./particle.js').define;
const assert = require('assert');
const PECInnerPort = require('./api-channel.js').PECInnerPort;
const ParticleSpec = require('./particle-spec.js');
const Schema = require('./schema.js');

class RemoteView {
  constructor(id, type, port, pec, name, version) {
    this._id = id;
    this.type = type;
    this._port = port;
    this._pec = pec;
    this.name = name;
    this._version = version;
    this.state = 'outOfDate';
  }

  generateID() {
    return this._pec.generateID();
  }

  on(type, callback, target) {
    var dataFreeCallback = (d) => callback();
    this.synchronize(type, dataFreeCallback, dataFreeCallback, target);
  }

  synchronize(type, modelCallback, callback, target) {
    this._port.Synchronize({view: this, modelCallback, callback, target, type});
  }

  get() {
    return new Promise((resolve, reject) =>
      this._port.ViewGet({ callback: r => {resolve(r)}, view: this }));
  }

  toList() {
    return new Promise((resolve, reject) =>
      this._port.ViewToList({ callback: r => resolve(r), view: this }));
  }

  set(entity) {
    this._port.ViewSet({data: entity, view: this});
  }

  store(entity) {
    this._port.ViewStore({data: entity, view: this});
  }
}

class InnerPEC {
  constructor(port, idBase, loader) {
    this._apiPort = new PECInnerPort(port);
    this._views = new Map();
    this._particles = [];
    this._idBase = idBase;
    this._nextLocalID = 0;
    this._loader = loader;
    this._pendingLoads = [];

    /*
     * This code ensures that the relevant types are known
     * in the scope object, because otherwise we can't do
     * particleSpec resolution, which is currently a necessary
     * part of particle construction.
     *
     * Possibly we should eventually consider having particle
     * specifications separated from particle classes - and
     * only keeping type information on the arc side.
     */
    this._apiPort.onDefineView = ({viewType, identifier, name, version}) => {
      return new RemoteView(identifier, Type.fromLiteral(viewType), this._apiPort, this, name, version);
    };

    this._apiPort.onDefineParticle = ({particleDefinition, particleFunction}) => {
      var particle = define(particleDefinition, eval(particleFunction));
      this._loader.registerParticle(particle);
    };

    this._apiPort.onInstantiateParticle =
      ({spec, views}) => this._instantiateParticle(spec, views);

    this._apiPort.onViewCallback = ({callback, data}) => callback(data);

    this._apiPort.onAwaitIdle = ({version}) =>
      this.idle.then(a => this._apiPort.Idle({version, relevance: this.relevance}));

    this._apiPort.onUIEvent = ({particle, slotName, event}) => particle.fireEvent(slotName, event);

    this._apiPort.onStartRender = ({particle, slotName, contentTypes}) => {
      class Slotlet {
        constructor(pec, particle, slotName) {
          this._slotName = slotName;
          this._particle = particle;
          this._handlers = new Map();
          this._pec = pec;
          this._requestedContentTypes = new Set();
        }
        get particle() { return this._particle; }
        get slotName() { return this._slotName; }
        get isRendered() { return this._isRendered; }
        render(content) {
          this._pec._apiPort.Render({particle, slotName, content});

          Object.keys(content).forEach(key => { this._requestedContentTypes.delete(key) });
          // Slot is considered rendered, if a non-empty content was sent and all requested content types were fullfilled.
          this._isRendered = this._requestedContentTypes.size == 0 && (Object.keys(content).length > 0);
        }
        registerEventHandler(name, f) {
          if (!this._handlers.has(name)) {
            this._handlers.set(name, []);
          }
          this._handlers.get(name).push(f);
        }
        clearEventHandlers(name) {
          this._handlers.set(name, []);
        }
        fireEvent(event) {
          for (var handler of this._handlers.get(event.handler) || []) {
            handler(event);
          }
        }
      }

      particle._slotByName.set(slotName, new Slotlet(this, particle, slotName));
      particle.render(slotName, contentTypes);
    };

    this._apiPort.onStopRender = ({particle, slotName}) => {
      assert(particle._slotByName.has(slotName),
        `Stop render called for particle ${particle.name} slot ${slotName} without start render being called.`);
      particle._slotByName.delete(slotName);
    }
  }

  generateID() {
    return `${this._idBase}:${this._nextLocalID++}`;
  }

  async _instantiateParticle(spec, views) {
    let name = spec.name;
    var resolve = null;
    var p = new Promise((res, rej) => resolve = res);
    this._pendingLoads.push(p);
    let clazz = await this._loader.loadParticleClass(spec);;
    let particle = new clazz();
    this._particles.push(particle);

    var viewMap = new Map();
    views.forEach((value, key) => {
      viewMap.set(key, viewlet.viewletFor(value, value.type.isView));
    });

    for (var view of viewMap.values()) {
      var type = view.underlyingView().type;
      let schemaModel;
      if (type.isView) {
        schemaModel = type.primitiveType().entitySchema;
      } else {
        schemaModel = type.entitySchema;
      }
      view.entityClass = new Schema(schemaModel).entityClass();
    }

    setTimeout(() => {
      resolve();
      var idx = this._pendingLoads.indexOf(p);
      this._pendingLoads.splice(idx, 1);
      particle.setViews(viewMap);
    }, 0);
    return particle;
  }

  get relevance() {
    var rMap = new Map();
    this._particles.forEach(p => {
      if (p.relevances.length == 0)
        return;
      rMap.set(p, p.relevances);
      p.relevances = [];
    });
    return rMap;
  }

  get busy() {
    if (this._pendingLoads.length > 0)
      return true;
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
    return Promise.all(this._pendingLoads.concat(this._particles.map(particle => particle.idle))).then(() => this.idle);
  }
}

module.exports = InnerPEC;
