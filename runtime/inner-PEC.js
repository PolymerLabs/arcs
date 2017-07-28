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

    this._apiPort.onLostSlots = ({particles}) => particles.forEach(particle => particle.slotReleased());

    this._apiPort.onUIEvent = ({particle, event}) => particle.fireEvent(event);
  }

  generateID() {
    return `${this._idBase}:${this._nextLocalID++}`;
  }

  _instantiateParticle(spec, views) {
    spec = new ParticleSpec(spec);
    let name = spec.name;
    let clazz = this._loader.loadParticleClass(spec);
    let particle = new clazz();
    this._particles.push(particle);

    var viewMap = new Map();
    views.forEach((value, key) => {
      viewMap.set(key, viewlet.viewletFor(value, value.type.isView));
    });

    class Slotlet {
      constructor(pec, particle) {
        this._particle = particle;
        this._handlers = new Map();
        this._pec = pec;
      }
      render(content) {
        this._pec._apiPort.RenderSlot({content, particle: this._particle});
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

    particle.setSlotCallback(async (name, state) => {
      switch (state) {
        case "Need":
          /*var data =*/ await new Promise((resolve/*, reject*/) =>
            this._apiPort.GetSlot({name, particle, callback: r => resolve(r)})
          );
          particle.setSlot(new Slotlet(this, particle));
          break;

        case "No":
          this._apiPort.ReleaseSlot({particle})
          break;
      }
    });


    for (var view of viewMap.values()) {
      var type = view.underlyingView().type;
      let schemaModel;
      if (type.isView) {
        schemaModel = type.primitiveType().schema;
      } else {
        schemaModel = type.schema;
      }
      view.entityClass = new Schema(schemaModel).entityClass();
    }

    // the problem with doing this here is that it's only after we return particle below
    // that the target mapping gets established.
    Promise.resolve().then(() => particle.setViews(viewMap));

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

module.exports = InnerPEC;
