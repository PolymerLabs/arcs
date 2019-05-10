/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {assert} from '../platform/assert-web.js';

import {PECInnerPort} from './api-channel.js';
import {Handle, handleFor} from './handle.js';
import {Id, IdGenerator} from './id.js';
import {Loader} from './loader.js';
import {ParticleSpec} from './particle-spec.js';
import {Particle} from './particle.js';
import {SlotProxy} from './slot-proxy.js';
import {StorageProxy, StorageProxyScheduler} from './storage-proxy.js';
import {Type} from './type.js';
import {MessagePort} from './message-channel.js';

export type PecFactory = (pecId: Id, idGenerator: IdGenerator) => MessagePort;

export type InnerArcHandle = {
  createHandle(type: Type, name: string, hostParticle?: Particle): Promise<Handle>;
  mapHandle(handle: Handle): Promise<string>;
  createSlot(transformationParticle: Particle, transformationSlotName: string, handleId: string): Promise<string>;
  loadRecipe(recipe: string): Promise<{error?: string}>;
};

export class ParticleExecutionContext {
  private readonly apiPort : PECInnerPort;
  private readonly particles = <Particle[]>[];
  private readonly pecId: Id;
  private readonly loader: Loader;
  private readonly pendingLoads = <Promise<void>[]>[];
  private readonly scheduler: StorageProxyScheduler = new StorageProxyScheduler();
  private readonly keyedProxies: { [index: string]: StorageProxy | Promise<StorageProxy>} = {};

  readonly idGenerator: IdGenerator;

  constructor(port, pecId: Id, idGenerator: IdGenerator, loader: Loader) {
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
        transformationParticle.renderHostedSlot(transformationSlotName, hostedSlotId, content);
      }

      onStop(): void {
        if (global['close']) {
          global['close']();
        }
      }

      async onInstantiateParticle(id: string, spec: ParticleSpec, proxies: ReadonlyMap<string, StorageProxy>) {
        return pec._instantiateParticle(id, spec, proxies);
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
        particle.fireEvent(slotName, event);
      }

      onStartRender(particle: Particle, slotName: string, providedSlots: ReadonlyMap<string, string>, contentTypes: string[]) {
        particle.addSlotProxy(new SlotProxy(this, particle, slotName, providedSlots));
        particle.renderSlot(slotName, contentTypes);
      }

      onStopRender(particle: Particle, slotName: string) {
        assert(particle.hasSlotProxy(slotName), `Stop render called for particle ${particle.spec.name} slot ${slotName} without start render being called.`);
        particle.removeSlotProxy(slotName);
      }
    }(port);

    this.pecId = pecId;
    this.idGenerator = idGenerator;
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
    return this.idGenerator.newChildId(this.pecId).toString();
  }

  innerArcHandle(arcId: string, particleId: string): InnerArcHandle {
    const pec = this;
    return {
      async createHandle(type: Type, name: string, hostParticle?: Particle) {
        return new Promise((resolve, reject) =>
          pec.apiPort.ArcCreateHandle(proxy => {
            const handle = handleFor(proxy, pec.idGenerator, name, particleId);
            resolve(handle);
            if (hostParticle) {
              proxy.register(hostParticle, handle);
            }
          }, arcId, type, name));
      },
      async mapHandle(handle: Handle) {
        return new Promise((resolve, reject) =>
          pec.apiPort.ArcMapHandle(id => {
            resolve(id);
          }, arcId, handle));  // recipe handle vs not?
      },
      async createSlot(transformationParticle, transformationSlotName, handleId) {
        // handleId: the ID of a handle (returned by `createHandle` above) this slot is rendering; null - if not applicable.
        // TODO: support multiple handle IDs.
        return new Promise((resolve, reject) =>
          pec.apiPort.ArcCreateSlot(hostedSlotId => resolve(hostedSlotId), arcId, transformationParticle, transformationSlotName, handleId)
        );
      },
      async loadRecipe(recipe: string) {
        // TODO: do we want to return a promise on completion?
        return new Promise((resolve, reject) => pec.apiPort.ArcLoadRecipe(arcId, recipe, response => {
          if (response.error) {
            reject(response.error);
          } else {
            resolve(response);
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
      constructInnerArc: async particle => {
        return new Promise<InnerArcHandle>((resolve, reject) =>
          this.apiPort.ConstructInnerArc(arcId => resolve(this.innerArcHandle(arcId, particle.id)), particle));
      },
      // TODO(sjmiles): experimental `services` impl
      serviceRequest: (particle, args, callback) => {
        this.apiPort.ServiceRequest(particle, args, callback);
      }
    };
  }

  // tslint:disable-next-line: no-any
  async _instantiateParticle(id: string, spec: ParticleSpec, proxies: ReadonlyMap<string, StorageProxy>): Promise<[any, () => Promise<void>]> {
    let resolve : () => void = null;
    const p = new Promise<void>(res => resolve = res);
    this.pendingLoads.push(p);
    const clazz = await this.loader.loadParticleClass(spec);
    const capabilities = this.defaultCapabilitySet();
    const particle = new clazz();
    particle.setCapabilities(capabilities);

    this.particles.push(particle);

    const handleMap = new Map();
    const registerList: {proxy: StorageProxy, particle: Particle, handle: Handle}[] = [];

    proxies.forEach((proxy, name) => {
      const connSpec = spec.handleConnectionMap.get(name);
      const handle = handleFor(proxy, this.idGenerator, name, id, connSpec.isInput, connSpec.isOutput);
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
      p.relevances.length = 0; // truncate
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
    const busyParticlePromises = this.particles.filter(async particle => particle.busy).map(async particle => particle.idle);
    return Promise.all([this.scheduler.idle, ...this.pendingLoads, ...busyParticlePromises]).then(() => this.idle);
  }
}
