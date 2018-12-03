/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {handleFor, Handle} from './handle.js';
import {assert} from '../../platform/assert-web.js';
import {PECInnerPort} from './api-channel.js';
import {StorageProxy, StorageProxyScheduler} from './storage-proxy.js';
import {ParticleSpec} from './particle-spec.js';
import {Loader} from './loader.js';
import {Particle} from './particle.js';
import {Id} from './id.js';
import {Type} from './type.js';

export class ParticleExecutionContext {
  private apiPort : PECInnerPort;
  private particles = <Particle[]>[];
  private idBase: Id;
  private loader: Loader;
  private pendingLoads = <Promise<void>[]>[]; 
  private scheduler: StorageProxyScheduler = new StorageProxyScheduler();
  private keyedProxies: { [index: string]: StorageProxy | Promise<StorageProxy>} = {};

  constructor(port, idBase: string, loader: Loader) {
    const pec = this;

    this.apiPort = new class extends PECInnerPort {

      onDefineHandle(identifier: string, type: Type, name: string) {
        return StorageProxy.newProxy(identifier, type, this, pec, pec.scheduler, name);
      }

      onGetBackingStoreCallback(callback: (proxy: StorageProxy, key: string) => void, type: Type, name: string, id: string, storageKey: string) {
        const proxy = StorageProxy.newProxy(id, type, this, pec, pec.scheduler, name);
        proxy.storageKey = storageKey;
        return [proxy, () => callback(proxy, storageKey)];
      }

      onCreateHandleCallback(callback: (proxy: StorageProxy) => void, type: Type, name: string, id: string) {
        const proxy = StorageProxy.newProxy(id, type, this, pec, pec.scheduler, name);
        return [proxy, () => callback(proxy)];
      }

      onMapHandleCallback(callback: (id: string) => void, id: string) {
        return [id, () => callback(id)];
      }

      onCreateSlotCallback(callback: (id: string) => void, hostedSlotId: string) {
        return [hostedSlotId, () => callback(hostedSlotId)];
      }

      onInnerArcRender(transformationParticle: Particle, transformationSlotName: string, hostedSlotId: string, content: string) {
        // TODO(mmandlis): this dependency on renderHostedSlot means that only TransformationDomParticles can
        // be transformations. 
        // tslint:disable-next-line: no-any
        (transformationParticle as any).renderHostedSlot(transformationSlotName, hostedSlotId, content);
      }
  
      onStop() {
        if (global['close']) {
          global['close']();
        }
      }
  
      onInstantiateParticle(id: string, spec: ParticleSpec, handles: {[index: string]: Handle}) {
        return pec._instantiateParticle(id, spec, handles);
      }

      onSimpleCallback(callback: ({}) => void, data: {}) {
        callback(data);
      } 

      onConstructArcCallback(callback: (arc: string) => void, arc: string) {
        callback(arc);
      }

      onAwaitIdle(version: number) {
        pec.idle.then(a => {
          // TODO: dom-particles update is async, this is a workaround to allow dom-particles to
          // update relevance, after handles are updated. Needs better idle signal.
          setTimeout(() => { this.Idle(version, pec.relevance); }, 0);
        });
      }
  
      onUIEvent(particle: Particle, slotName: string, event: {}) {
        // TODO(mmandlis): this dependency on fireEvent means that only DomParticles can
        // be UI particles.
        // tslint:disable-next-line: no-any
        (particle as any).fireEvent(slotName, event);
      }

      onStartRender(particle: Particle, slotName: string, providedSlots: Map<string, string>, contentTypes: string[]) {
        const apiPort = this;
        /**
         * A representation of a consumed slot. Retrieved from a particle using
         * particle.getSlot(name)
         */
        class Slotlet {
          readonly slotName: string;
          readonly particle: Particle;
          private handlers = new Map<string, ((event: {}) => void)[]>();
          private pec: ParticleExecutionContext;
          private providedSlots: Map<string, string>;
          private requestedContentTypes = new Set<string>();
          private _isRendered = false;
          constructor(pec: ParticleExecutionContext, particle: Particle, slotName: string, providedSlots: Map<string, string>) {
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
                  content.template = this.substituteSlotNamesForIds(content.template);
                } else {
                  content.template = Object.entries(content.template).reduce(
                      (templateDictionary, [templateName, templateValue]) => {
                        templateDictionary[templateName] = this.substituteSlotNamesForIds(templateValue);
                      return templateDictionary;
                    }, {});
                }
              }
            }
  
            apiPort.Render(particle, slotName, content);
  
            Object.keys(content).forEach(key => { this.requestedContentTypes.delete(key); });
            // Slot is considered rendered, if a non-empty content was sent and all requested content types were fullfilled.
            this._isRendered = this.requestedContentTypes.size === 0 && (Object.keys(content).length > 0);
          }
          private substituteSlotNamesForIds(template) {
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
          /** @method registerEventHandler(name, f)
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
  
        // TODO(mmandlis): these dependencies on _slotByName and renderSlot mean that only DomParticles can
        // be UI particles.
        // tslint:disable-next-line: no-any
        (particle as any)._slotByName.set(slotName, new Slotlet(pec, particle, slotName, providedSlots));
        // tslint:disable-next-line: no-any
        (particle as any).renderSlot(slotName, contentTypes);
      }
  
      onStopRender(particle: Particle, slotName: string) {
        // TODO(mmandlis): this dependency on _slotByName and name means that only DomParticles can
        // be UI particles.
        // tslint:disable-next-line: no-any
        assert((particle as any)._slotByName.has(slotName), `Stop render called for particle ${(particle as any).name} slot ${slotName} without start render being called.`);
        // tslint:disable-next-line: no-any
        (particle as any)._slotByName.delete(slotName);
      }
    }(port);

    this.idBase = Id.newSessionId().fromString(idBase);
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
  }

  generateID() {
    return this.idBase.createId().toString();
  }

  innerArcHandle(arcId: string, particleId: string) {
    const pec = this;
    return {
      createHandle(type, name, hostParticle) {
        return new Promise((resolve, reject) =>
          pec.apiPort.ArcCreateHandle(proxy => {
            const handle = handleFor(proxy, name, particleId);
            resolve(handle);
            if (hostParticle) {
              proxy.register(hostParticle, handle);
            }
          }, arcId, type, name));
      },
      mapHandle(handle: Handle) {
        return new Promise((resolve, reject) =>
          pec.apiPort.ArcMapHandle(id => {
            resolve(id);
          }, arcId, handle));
      },
      createSlot(transformationParticle, transformationSlotName, hostedParticleName, hostedSlotName, handleId) {
        // handleId: the ID of a handle (returned by `createHandle` above) this slot is rendering; null - if not applicable.
        // TODO: support multiple handle IDs.
        return new Promise((resolve, reject) =>
          pec.apiPort.ArcCreateSlot(hostedSlotId => resolve(hostedSlotId), arcId, transformationParticle, transformationSlotName, hostedParticleName, hostedSlotName, handleId)
          );
      },
      loadRecipe(recipe) {
        // TODO: do we want to return a promise on completion?
        return new Promise((resolve, reject) => pec.apiPort.ArcLoadRecipe(arcId, recipe, a => {
          if (a == undefined) {
            resolve();
          } else {
            reject(a);
          }
        }));
      }
    };
  }

  getStorageProxy(storageKey, type) {
    if (!this.keyedProxies[storageKey]) {      
      this.keyedProxies[storageKey] = new Promise((resolve, reject) => {
        this.apiPort.GetBackingStore((proxy, storageKey) => {
          this.keyedProxies[storageKey] = proxy;
          resolve(proxy);
        }, storageKey, type);
      });
    }
    return this.keyedProxies[storageKey];
  }

  defaultCapabilitySet() {
    return {
      constructInnerArc: particle => {
        return new Promise((resolve, reject) =>
          this.apiPort.ConstructInnerArc(arcId => resolve(this.innerArcHandle(arcId, particle.id)), particle));
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
