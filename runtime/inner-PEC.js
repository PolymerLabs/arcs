/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
'use strict';

import Type from './type.js';
import handle from './handle.js';
import assert from '../platform/assert-web.js';
import {PECInnerPort} from './api-channel.js';
import ParticleSpec from './particle-spec.js';
import Schema from './schema.js';

class StorageProxy {
  constructor(id, type, port, pec, name, version) {
    this._id = id;
    this._type = type;
    this._port = port;
    this._pec = pec;
    this.name = name;
    this._version = version;
    this.state = 'outOfDate';
  }

  get id() {
    return this._id;
  }

  get type() {
    return this._type;
  }

  generateIDComponents() {
    return this._pec.generateIDComponents();
  }

  on(type, callback, target, particleId) {
    let dataFreeCallback = (d) => callback();
    this.synchronize(type, dataFreeCallback, dataFreeCallback, target, particleId);
  }

  synchronize(type, modelCallback, callback, target, particleId) {
    this._port.Synchronize({handle: this, modelCallback, callback, target, type, particleId});
  }

  get(particleId) {
    return new Promise((resolve, reject) =>
      this._port.HandleGet({callback: r => resolve(r), handle: this, particleId}));
  }

  toList(particleId) {
    return new Promise((resolve, reject) =>
      this._port.HandleToList({callback: r => resolve(r), handle: this, particleId}));
  }

  set(entity, particleId) {
    this._port.HandleSet({data: entity, handle: this, particleId});
  }

  store(entity, particleId) {
    this._port.HandleStore({data: entity, handle: this, particleId});
  }

  remove(entityId, particleId) {
    this._port.HandleRemove({data: entityId, handle: this, particleId});
  }

  clear(particleId) {
    this._port.HandleClear({handle: this, particleId});
  }
}

class InnerPEC {
  constructor(port, idBase, loader) {
    this._apiPort = new PECInnerPort(port);
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
    this._apiPort.onDefineHandle = ({type, identifier, name, version}) => {
      return new StorageProxy(identifier, type, this._apiPort, this, name, version);
    };

    this._apiPort.onCreateHandleCallback = ({type, id, name, callback}) => {
      let proxy = new StorageProxy(id, type, this._apiPort, this, name, 0);
      Promise.resolve().then(() => callback(proxy));
      return proxy;
    };

    this._apiPort.onMapHandleCallback = ({id, callback}) => {
      Promise.resolve().then(() => callback(id));
      return id;
    };

    this._apiPort.onCreateSlotCallback = ({hostedSlotId, callback}) => {
      Promise.resolve().then(() => callback(hostedSlotId));
      return hostedSlotId;
    };

    this._apiPort.onInnerArcRender = ({transformationParticle, transformationSlotName, hostedSlotId, content}) => {
      transformationParticle.renderHostedSlot(transformationSlotName, hostedSlotId, content);
    };

    this._apiPort.onStop = () => {
      if (global.close) {
        global.close();
      }
    };

    this._apiPort.onInstantiateParticle =
      ({id, spec, handles}) => this._instantiateParticle(id, spec, handles);

    this._apiPort.onSimpleCallback = ({callback, data}) => callback(data);

    this._apiPort.onConstructArcCallback = ({callback, arc}) => callback(arc);

    this._apiPort.onAwaitIdle = ({version}) =>
      this.idle.then(a => {
        // TODO: dom-particles update is async, this is a workaround to allow dom-particles to
        // update relevance, after handles are updated. Needs better idle signal.
        setTimeout(() => { this._apiPort.Idle({version, relevance: this.relevance}); }, 0);
      });

    this._apiPort.onUIEvent = ({particle, slotName, event}) => particle.fireEvent(slotName, event);

    this._apiPort.onStartRender = ({particle, slotName, contentTypes}) => {
      /** @class Slot
       * A representation of a consumed slot. Retrieved from a particle using
       * particle.getSlot(name)
       */
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
        /** @method render(content)
         * renders content to the slot.
         */
        render(content) {
          this._pec._apiPort.Render({particle, slotName, content});

          Object.keys(content).forEach(key => { this._requestedContentTypes.delete(key); });
          // Slot is considered rendered, if a non-empty content was sent and all requested content types were fullfilled.
          this._isRendered = this._requestedContentTypes.size == 0 && (Object.keys(content).length > 0);
        }
        /** @method registerEventHandler(name, f)
         * registers a callback to be invoked when 'name' event happens.
         */
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
          for (let handler of this._handlers.get(event.handler) || []) {
            handler(event);
          }
        }
      }

      particle._slotByName.set(slotName, new Slotlet(this, particle, slotName));
      particle.renderSlot(slotName, contentTypes);
    };

    this._apiPort.onStopRender = ({particle, slotName}) => {
      assert(particle._slotByName.has(slotName),
        `Stop render called for particle ${particle.name} slot ${slotName} without start render being called.`);
      particle._slotByName.delete(slotName);
    };
  }

  generateIDComponents() {
    return {base: this._idBase, component: () => this._nextLocalID++};
  }

  generateID() {
    return `${this._idBase}:${this._nextLocalID++}`;
  }

  innerArcHandle(arcId, particleId) {
    let pec = this;
    return {
      createHandle: function(type, name) {
        return new Promise((resolve, reject) =>
          pec._apiPort.ArcCreateHandle({arc: arcId, type, name, callback: proxy => {
            let v = handle.handleFor(proxy, proxy.type.isSetView, particleId);
            v.entityClass = (proxy.type.isSetView ? proxy.type.primitiveType().entitySchema : proxy.type.entitySchema).entityClass();
            resolve(v);
          }}));
      },
      mapHandle: function(handle) {
        return new Promise((resolve, reject) =>
          pec._apiPort.ArcMapHandle({arc: arcId, handle, callback: id => {
            resolve(id);
          }}));
      },
      createSlot: function(transformationParticle, transformationSlotName, hostedParticleName, hostedSlotName) {
        return new Promise((resolve, reject) =>
          pec._apiPort.ArcCreateSlot({arc: arcId, transformationParticle, transformationSlotName, hostedParticleName, hostedSlotName, callback: hostedSlotId => {
            resolve(hostedSlotId);
          }}));
      },
      loadRecipe: function(recipe) {
        // TODO: do we want to return a promise on completion?
        return new Promise((resolve, reject) =>
          pec._apiPort.ArcLoadRecipe({arc: arcId, recipe, callback: a => {
            if (a == undefined)
              resolve();
            else
              reject(a);
          }}));
      }
    };
  }

  defaultCapabilitySet() {
    return {
      constructInnerArc: particle => {
        return new Promise((resolve, reject) =>
          this._apiPort.ConstructInnerArc({callback: arcId => {resolve(this.innerArcHandle(arcId, particle.id));}, particle}));
      }
    };
  }

  async _instantiateParticle(id, spec, proxies) {
    let name = spec.name;
    let resolve = null;
    let p = new Promise((res, rej) => resolve = res);
    this._pendingLoads.push(p);
    let clazz = await this._loader.loadParticleClass(spec);
    let capabilities = this.defaultCapabilitySet();
    let particle = new clazz(); // TODO: how can i add an argument to DomParticle ctor?
    particle.id = id;
    particle.capabilities = capabilities;
    this._particles.push(particle);

    let handleMap = new Map();
    proxies.forEach((value, key) => {
      handleMap.set(key, handle.handleFor(value, value.type.isSetView, id, spec.connectionMap.get(key).isInput, spec.connectionMap.get(key).isOutput));
    });

    for (let localHandle of handleMap.values()) {
      let type = localHandle.underlyingProxy().type;
      let schemaModel;
      if (type.isSetView && type.primitiveType().isEntity) {
        schemaModel = type.primitiveType().entitySchema;
      } else if (type.isEntity) {
        schemaModel = type.entitySchema;
      }

      if (schemaModel)
        localHandle.entityClass = schemaModel.entityClass();
    }

    return [particle, async () => {
      resolve();
      let idx = this._pendingLoads.indexOf(p);
      this._pendingLoads.splice(idx, 1);
      await particle.setViews(handleMap);
    }];
  }

  get relevance() {
    let rMap = new Map();
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

export default InnerPEC;
