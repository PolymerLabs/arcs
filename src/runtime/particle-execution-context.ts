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
import {Runnable} from './hot.js';
import {Loader} from './loader.js';
import {ParticleSpec} from './particle-spec.js';
import {Particle, Capabilities} from './particle.js';
import {SlotProxy} from './slot-proxy.js';
import {Content} from './slot-consumer.js';
import {StorageProxy, StorageProxyScheduler} from './storage-proxy.js';
import {Type} from './type.js';
import {MessagePort} from './message-channel.js';
import {WasmContainer, WasmParticle} from './wasm.js';
import {Dictionary} from './hot.js';
import {UserException} from './arc-exceptions.js';

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
  private readonly keyedProxies: Dictionary<StorageProxy | Promise<StorageProxy>> = {};
  private readonly wasmContainers: Dictionary<WasmContainer> = {};

  readonly idGenerator: IdGenerator;

  constructor(port: MessagePort, pecId: Id, idGenerator: IdGenerator, loader: Loader) {
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

      onInnerArcRender(transformationParticle: Particle, transformationSlotName: string, hostedSlotId: string, content: Content) {
        transformationParticle.renderHostedSlot(transformationSlotName, hostedSlotId, content);
      }

      onStop(): void {
        if (global['close']) {
          global['close']();
        }
      }

      async onInstantiateParticle(id: string, spec: ParticleSpec, proxies: ReadonlyMap<string, StorageProxy>) {
        return pec.instantiateParticle(id, spec, proxies);
      }

      async onReloadParticle(id: string) {
        return pec.reloadParticle(id);
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
          setTimeout(() => this.Idle(version, pec.relevance), 0);
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
      async loadRecipe(recipe: string): Promise<{error?: string}> {
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

  capabilities(hasInnerArcs: boolean): Capabilities {
    const cap: Capabilities = {
      // TODO(sjmiles): experimental `services` impl
      serviceRequest: (particle, args, callback) => {
        this.apiPort.ServiceRequest(particle, args, callback);
      }
    };
    if (hasInnerArcs) {
      // TODO: Particle doesn't have an id field; not sure if it needs one or innerArcHandle shouldn't have that arg.
      cap.constructInnerArc = async particle => {
        return new Promise<InnerArcHandle>((resolve, reject) =>
          this.apiPort.ConstructInnerArc(arcId => resolve(this.innerArcHandle(arcId, undefined)), particle));
      };
    }
    return cap;
  }

  // tslint:disable-next-line: no-any
  private async instantiateParticle(id: string, spec: ParticleSpec, proxies: ReadonlyMap<string, StorageProxy>): Promise<[any, () => Promise<void>]> {
    let resolve: Runnable;
    const p = new Promise<void>(res => resolve = res);
    this.pendingLoads.push(p);

    let particle: Particle;
    if (spec.implFile && spec.implFile.endsWith('.wasm')) {
      particle = await this.loadWasmParticle(spec);
      particle.setCapabilities(this.capabilities(false));
    } else {
      const clazz = await this.loader.loadParticleClass(spec);
      if (!clazz) {
        return Promise.reject(new Error(`Could not load particle ${id} ${spec.name}`));
      }
      particle = new clazz();
      particle.setCapabilities(this.capabilities(true));
    }
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
      await particle.callSetHandles(handleMap, err => {
        const exc = new UserException(err, 'setHandles', id, spec.name);
        this.apiPort.ReportExceptionInHost(exc);
      });
      registerList.forEach(({proxy, particle, handle}) => proxy.register(particle, handle));
      const idx = this.pendingLoads.indexOf(p);
      this.pendingLoads.splice(idx, 1);
      resolve();
    }];
  }

  private async reloadParticle(id: string) {
    // TODO(sherrypra): Implement this method.
  }

  private async loadWasmParticle(spec: ParticleSpec) {
    assert(spec.name.length > 0);

    let container = this.wasmContainers[spec.implFile];
    if (!container) {
      const buffer = await this.loader.loadBinary(spec.implFile);
      if (!buffer || buffer.byteLength === 0) {
        throw new Error(`Failed to load binary file '${spec.implFile}'`);
      }
      container = new WasmContainer();
      await container.initialize(buffer);
      this.wasmContainers[spec.implFile] = container;
    }

    // Particle constructor expects spec to be attached to the class object (and attaches it to
    // the particle instance at that time).
    WasmParticle.spec = spec;
    const particle = new WasmParticle(container);
    WasmParticle.spec = null;
    return particle;
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
