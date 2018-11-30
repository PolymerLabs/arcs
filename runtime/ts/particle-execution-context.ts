/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {handleFor} from './handle.js';
import {assert} from '../../platform/assert-web.js';
import {PECInnerPort} from '../api-channel.js';
import {StorageProxy, StorageProxyScheduler} from './storage-proxy.js';
import {ParticleSpec} from './particle-spec.js';
import {Loader} from './loader.js';
import {Particle} from './particle.js';

export class ParticleExecutionContext {
  private apiPort : PECInnerPort;
  private particles = <Particle[]>[];
  private idBase: string;
  private _nextLocalID = 0;
  private loader: Loader;
  private pendingLoads = <Promise<void>[]>[]; 
  private scheduler: StorageProxyScheduler = new StorageProxyScheduler();
  private keyedProxies: { [index: string]: StorageProxy | Promise<StorageProxy>} = {};

  constructor(port, idBase: string, loader: Loader) {
    this.apiPort = new PECInnerPort(port);
    this.idBase = idBase;
    this.loader = loader;
    loader.setParticleExecutionContext(this);

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
    this.apiPort.onDefineHandle = ({type, identifier, name}) => {
      return StorageProxy.newProxy(identifier, type, this.apiPort, this, this.scheduler, name);
    };

    this.apiPort.onGetBackingStoreCallback = ({type, id, name, callback, storageKey}) => {
      const proxy = StorageProxy.newProxy(id, type, this.apiPort, this, this.scheduler, name);
      proxy.storageKey = storageKey;
      return [proxy, () => callback(proxy, storageKey)];
    };


    this.apiPort.onCreateHandleCallback = ({type, id, name, callback}) => {
      const proxy = StorageProxy.newProxy(id, type, this.apiPort, this, this.scheduler, name);
      return [proxy, () => callback(proxy)];
    };

    this.apiPort.onMapHandleCallback = ({id, callback}) => {
      return [id, () => callback(id)];
    };

    this.apiPort.onCreateSlotCallback = ({hostedSlotId, callback}) => {
      return [hostedSlotId, () => callback(hostedSlotId)];
    };

    this.apiPort.onInnerArcRender = ({transformationParticle, transformationSlotName, hostedSlotId, content}) => {
      transformationParticle.renderHostedSlot(transformationSlotName, hostedSlotId, content);
    };

    this.apiPort.onStop = () => {
      if (global['close']) {
        global['close']();
      }
    };

    this.apiPort.onInstantiateParticle =
      ({id, spec, handles}) => this._instantiateParticle(id, spec, handles);

    this.apiPort.onSimpleCallback = ({callback, data}) => callback(data);

    this.apiPort.onConstructArcCallback = ({callback, arc}) => callback(arc);

    this.apiPort.onAwaitIdle = ({version}) =>
      this.idle.then(a => {
        // TODO: dom-particles update is async, this is a workaround to allow dom-particles to
        // update relevance, after handles are updated. Needs better idle signal.
        setTimeout(() => { this.apiPort.Idle({version, relevance: this.relevance}); }, 0);
      });

    this.apiPort.onUIEvent = ({particle, slotName, event}) => particle.fireEvent(slotName, event);

    this.apiPort.onStartRender = ({particle, slotName, providedSlots, contentTypes}) => {
      /**
       * A representation of a consumed slot. Retrieved from a particle using
       * particle.getSlot(name)
       */
      class Slotlet {
        readonly slotName: string;
        readonly particle: ParticleSpec;
        private handlers = new Map<string, ((event: {}) => void)[]>();
        private pec: ParticleExecutionContext;
        private providedSlots: Map<string, string>;
        private requestedContentTypes = new Set<string>();
        private _isRendered = false;
        constructor(pec: ParticleExecutionContext, particle: ParticleSpec, slotName: string, providedSlots: Map<string, string>) {
          this.slotName = slotName;
          this.particle = particle;
          this.pec = pec;
          this.providedSlots = providedSlots;
        }
        get isRendered() { return this._isRendered; }
        /**
         * renders content to the slot.
         */
        render(content) {
          // TODO: This logic should live in dom-particle and referencing slots by name should be deprecated for the '{{$name}}' syntax.
          if (this.providedSlots.size > 0) {
            content = {...content};

            const slotIDs = {};
            this.providedSlots.forEach((slotId, slotName) => slotIDs[`$${slotName}`] = slotId);
            content.model = this.enhanceModelWithSlotIDs(content.model, slotIDs);

            if (content.template) {
              if (typeof content.template === 'string') {
                content.template = this.substituteSlotNamesForModelReferences(content.template);
              } else {
                content.template = Object.entries(content.template).reduce(
                    (templateDictionary, [templateName, templateValue]) => {
                      templateDictionary[templateName] = this.substituteSlotNamesForModelReferences(templateValue);
                      return templateDictionary;
                    }, {});
              }
            }
          }

          this.pec.apiPort.Render({particle, slotName, content});

          Object.keys(content).forEach(key => { this.requestedContentTypes.delete(key); });
          // Slot is considered rendered, if a non-empty content was sent and all requested content types were fullfilled.
          this._isRendered = this.requestedContentTypes.size === 0 && (Object.keys(content).length > 0);
        }
        private substituteSlotNamesForModelReferences(template) {
          this.providedSlots.forEach((slotId, slotName) => {
            // TODO: This is a simple string replacement right now,
            // ensuring that 'slotid' is an attribute on an HTML element would be an improvement.
            template = template.replace(new RegExp(`slotid=\"${slotName}\"`, 'gi'), `slotid$="{{$${slotName}}}"`);
          });
          return template;
        }
        // We put slot IDs at the top-level of the model as well as in models for sub-templates.
        // This is temporary and should go away when we move from sub-IDs to [(Entity, Slot)] constructs.
        private enhanceModelWithSlotIDs(model = {}, slotIDs, topLevel = true) {
          if (topLevel) {
            model = {...slotIDs, ...model};
          }
          if (model.hasOwnProperty('$template') && model.hasOwnProperty('models') && Array.isArray(model['models'])) {
            model['models'] = model['models'].map(m => this.enhanceModelWithSlotIDs(m, slotIDs));
          }
          for (const [key, value] of Object.entries(model)) {
            if (!!value && typeof value === 'object') {
            model[key] = this.enhanceModelWithSlotIDs(value, slotIDs, false);
            }
          }
          return model;
        }
        /**
         * registers a callback to be invoked when 'name' event happens.
         */
        registerEventHandler(name, f) {
          if (!this.handlers.has(name)) {
            this.handlers.set(name, []);
          }
          this.handlers.get(name).push(f);
        }
        clearEventHandlers(name) {
          this.handlers.set(name, []);
        }
        fireEvent(event) {
          for (const handler of this.handlers.get(event.handler) || []) {
            handler(event);
          }
        }
      }

      particle._slotByName.set(slotName, new Slotlet(this, particle, slotName, providedSlots));
      particle.renderSlot(slotName, contentTypes);
    };

    this.apiPort.onStopRender = ({particle, slotName}) => {
      assert(particle._slotByName.has(slotName),
        `Stop render called for particle ${particle.name} slot ${slotName} without start render being called.`);
      particle._slotByName.delete(slotName);
    };
  }

  generateIDComponents() {
    return {base: this.idBase, component: () => this._nextLocalID++};
  }

  generateID() {
    return `${this.idBase}:${this._nextLocalID++}`;
  }

  innerArcHandle(arcId, particleId) {
    const pec = this;
    return {
      createHandle(type, name, hostParticle) {
        return new Promise((resolve, reject) =>
          pec.apiPort.ArcCreateHandle({arc: arcId, type, name, callback: proxy => {
            const handle = handleFor(proxy, name, particleId);
            resolve(handle);
            if (hostParticle) {
              proxy.register(hostParticle, handle);
            }
          }}));
      },
      mapHandle(handle) {
        return new Promise((resolve, reject) =>
          pec.apiPort.ArcMapHandle({arc: arcId, handle, callback: id => {
            resolve(id);
          }}));
      },
      createSlot(transformationParticle, transformationSlotName, hostedParticleName, hostedSlotName, handleId) {
        // handleId: the ID of a handle (returned by `createHandle` above) this slot is rendering; null - if not applicable.
        // TODO: support multiple handle IDs.
        return new Promise((resolve, reject) =>
          pec.apiPort.ArcCreateSlot({arc: arcId, transformationParticle, transformationSlotName, hostedParticleName, hostedSlotName, handleId, callback: hostedSlotId => {
            resolve(hostedSlotId);
          }}));
      },
      loadRecipe(recipe) {
        // TODO: do we want to return a promise on completion?
        return new Promise((resolve, reject) => pec.apiPort.ArcLoadRecipe({
          arc: arcId,
          recipe,
          callback: a => {
            if (a == undefined) {
              resolve();
            } else {
              reject(a);
            }
          }
        }));
      }
    };
  }

  getStorageProxy(storageKey, type) {
    if (!this.keyedProxies[storageKey]) {      
      this.keyedProxies[storageKey] = new Promise((resolve, reject) => {
        this.apiPort.GetBackingStore({storageKey, type, callback: (proxy, storageKey) => {
          this.keyedProxies[storageKey] = proxy;
          resolve(proxy);
        }});
      });
    }
    return this.keyedProxies[storageKey];
  }

  defaultCapabilitySet() {
    return {
      constructInnerArc: particle => {
        return new Promise((resolve, reject) =>
          this.apiPort.ConstructInnerArc({callback: arcId => {resolve(this.innerArcHandle(arcId, particle.id));}, particle}));
      }
    };
  }

  async _instantiateParticle(id, spec, proxies) {
    const name = spec.name;
    let resolve : () => void = null;
    const p = new Promise<void>(res => resolve = res);
    this.pendingLoads.push(p);
    const clazz = await this.loader.loadParticleClass(spec);
    const capabilities = this.defaultCapabilitySet();
    const particle = new clazz(); // TODO: how can i add an argument to DomParticle ctor?
    particle.id = id;
    particle.capabilities = capabilities;
    this.particles.push(particle);

    const handleMap = new Map();
    const registerList = [];
    proxies.forEach((proxy, name) => {
      const connSpec = spec.connectionMap.get(name);
      const handle = handleFor(proxy, name, id, connSpec.isInput, connSpec.isOutput);
      handleMap.set(name, handle);

      // Defer registration of handles with proxies until after particles have a chance to
      // configure them in setHandles.
      registerList.push({proxy, particle, handle});
    });

    return [particle, async () => {
      await particle.setHandles(handleMap);
      registerList.forEach(({proxy, particle, handle}) => proxy.register(particle, handle));
      const idx = this.pendingLoads.indexOf(p);
      this.pendingLoads.splice(idx, 1);
      resolve();
    }];
  }

  get relevance() {
    const rMap = new Map();
    this.particles.forEach(p => {
      if (p.relevances.length === 0) {
        return;
      }
      rMap.set(p, p.relevances);
      p.relevances = [];
    });
    return rMap;
  }

  get busy() {
    if (this.pendingLoads.length > 0 || this.scheduler.busy) {
      return true;
    }
    if (this.particles.filter(particle => particle.busy).length > 0) {
      return true;
    }
    return false;
  }

  get idle() {
    if (!this.busy) {
      return Promise.resolve();
    }
    const busyParticlePromises = this.particles.filter(particle => particle.busy).map(particle => particle.idle);
    return Promise.all([this.scheduler.idle, ...this.pendingLoads, ...busyParticlePromises]).then(() => this.idle);
  }
}
