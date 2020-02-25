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
import {Id, IdGenerator} from './id.js';
import {Runnable} from './hot.js';
import {Loader} from '../platform/loader.js';
import {ParticleSpec} from './particle-spec.js';
import {Particle, Capabilities} from './particle.js';
import {StorageProxy} from './storageNG/storage-proxy.js';
import {CRDTTypeRecord} from './crdt/crdt.js';
import {ProxyCallback, ProxyMessage, StorageCommunicationEndpoint, StorageCommunicationEndpointProvider} from './storageNG/store.js';
import {PropagatedException} from './arc-exceptions.js';
import {Type, CollectionType} from './type.js';
import {MessagePort} from './message-channel.js';
import {WasmContainer, WasmParticle} from './wasm.js';
import {Dictionary} from './hot.js';
import {UserException} from './arc-exceptions.js';
import {Store} from './store.js';
import {SystemTrace} from '../tracelib/systrace.js';
import {delegateSystemTraceApis} from '../tracelib/systrace-helpers.js';
import {ChannelConstructor} from './channel-constructor.js';
import {Ttl} from './recipe/ttl.js';
import {Handle, handleNGFor} from './storageNG/handle.js';

export type PecFactory = (pecId: Id, idGenerator: IdGenerator) => MessagePort;

export type InnerArcHandle = {
  createHandle(type: Type, name: string, hostParticle?: Particle): Promise<Handle<CRDTTypeRecord>>;
  mapHandle(handle: Handle<CRDTTypeRecord>): Promise<string>;
  createSlot(transformationParticle: Particle, transformationSlotName: string, handleId: string): Promise<string>;
  loadRecipe(recipe: string): Promise<{error?: string}>;
};

@SystemTrace
export class ParticleExecutionContext implements StorageCommunicationEndpointProvider<CRDTTypeRecord> {
  private readonly apiPort : PECInnerPort;
  private readonly particles = new Map<string, Particle>();
  private readonly pecId: Id;
  private readonly loader: Loader;
  private readonly pendingLoads = <Promise<void>[]>[];
  private readonly keyedProxies: Dictionary<StorageProxy<CRDTTypeRecord> | Promise<StorageProxy<CRDTTypeRecord>>> = {};
  private readonly wasmContainers: Dictionary<WasmContainer> = {};

  readonly idGenerator: IdGenerator;

  constructor(port: MessagePort, pecId: Id, idGenerator: IdGenerator, loader: Loader) {
    const pec = this;

    this.apiPort = new class extends PECInnerPort {

      onDefineHandle(identifier: string, type: Type, name: string, storageKey: string, ttl: Ttl) {
        return new StorageProxy(identifier, pec, type, storageKey, ttl);
      }

      onGetBackingStoreCallback(
          callback: (proxy: StorageProxy<CRDTTypeRecord>, key: string) => void,
          type: Type,
          name: string,
          id: string,
          storageKey: string) {
        const proxy = new StorageProxy(id, pec, type, storageKey);
        return [proxy, () => callback(proxy, storageKey)];
      }

      onCreateHandleCallback(
          callback: (proxy: StorageProxy<CRDTTypeRecord>) => void,
          type: Type,
          name: string,
          id: string) {
        // TODO(shanestephens): plumb storageKey through to internally created handles too.
        const proxy = new StorageProxy(id, pec, type, null);
        return [proxy, () => callback(proxy)];
      }

      onMapHandleCallback(callback: (id: string) => void, id: string) {
        return [id, () => callback(id)];
      }

      onCreateSlotCallback(callback: (id: string) => void, hostedSlotId: string) {
        return [hostedSlotId, () => callback(hostedSlotId)];
      }

      onStop(): void {
        if (global['close'] && !global['inWorkerPool']) {
          global['close']();
        }
      }

      async onInstantiateParticle(id: string, spec: ParticleSpec, proxies: ReadonlyMap<string, StorageProxy<CRDTTypeRecord>>, reinstantiate: boolean) {
        return pec.instantiateParticle(id, spec, proxies, reinstantiate);
      }

      async onReinstantiateParticle(id: string, spec: ParticleSpec, proxies: ReadonlyMap<string, StorageProxy<CRDTTypeRecord>>) {
        assert(false, `Not implemented`);
      }

      async onReloadParticles(ids: string[]) {
        return pec.reloadParticles(ids);
      }

      onSimpleCallback(callback: ({}) => void, data: {}) {
        callback(data);
      }

      onConstructArcCallback(callback: (arc: string) => void, arc: string) {
        callback(arc);
      }

      onAwaitIdle(version: number) {
        pec.idle.then(a => {
          // TODO: ui-particle's update is async, this is a workaround to allow ui-particles to
          // update relevance, after handles are updated. Needs better idle signal.
          setTimeout(() => this.Idle(version, pec.relevance), 0);
        });
      }

      onUIEvent(particle: Particle, slotName: string, event: {}) {
        particle.fireEvent(slotName, event);
      }

    }(port);

    this.pecId = pecId;
    this.idGenerator = idGenerator;
    this.loader = loader;
    loader.setParticleExecutionContext(this);

    // Encapsulates system trace calls in messages.
    delegateSystemTraceApis(this.apiPort);

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

  getStorageEndpoint(storageProxy: StorageProxy<CRDTTypeRecord>): StorageCommunicationEndpoint<CRDTTypeRecord> {
    const pec = this;
    let idPromise: Promise<number> = null;
    let id: number = null;
    return {
      async onProxyMessage(message: ProxyMessage<CRDTTypeRecord>): Promise<boolean> {
        if (idPromise == null) {
          throw new Error('onProxyMessage called without first calling setCallback!');
        }
        if (id == null) {
          id = await idPromise;
          if (id == null) {
            throw new Error('undefined id received .. somehow');
          }
        }
        message.id = id;
        return new Promise((resolve) =>
          pec.apiPort.ProxyMessage(storageProxy, message, ret => resolve(ret)));
      },

      setCallback(callback: ProxyCallback<CRDTTypeRecord>): void {
        idPromise = new Promise<number>((resolve) =>
          pec.apiPort.Register(storageProxy, x => storageProxy.onMessage(x), retId => resolve(retId)));
      },
      reportExceptionInHost(exception: PropagatedException): void {
        pec.apiPort.ReportExceptionInHost(exception);
      },
      getChannelConstructor(): ChannelConstructor {
        return pec;
      }
    };
  }

  reportExceptionInHost(exception: PropagatedException): void {
    this.apiPort.ReportExceptionInHost(exception);
  }

  innerArcHandle(arcId: string, particleId: string): InnerArcHandle {
    const pec = this;
    return {
      async createHandle(type: Type, name: string, hostParticle?: Particle) {
        if (type === null) {
          throw new Error(`Can't create handle with null Type`);
        }
        return new Promise((resolve, reject) =>
          pec.apiPort.ArcCreateHandle(proxy => {
            const handle = handleNGFor(Math.random() + '', proxy, pec.idGenerator, hostParticle, true, true, name);
            resolve(handle);
          }, arcId, type, name));
      },
      async mapHandle(handle: Handle<CRDTTypeRecord>) {
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

  /**
   * Establishes a storage proxy that's connected to the provided storage key.
   */
  async getStorageProxy(storageKey: string, type: Type): Promise<StorageProxy<CRDTTypeRecord>> {
    type = new CollectionType(type);
    if (!this.keyedProxies[storageKey]) {
      this.keyedProxies[storageKey] = new Promise((resolve, reject) => {
        this.apiPort.GetBackingStore((proxy, newStorageKey) => {
          if (storageKey !== newStorageKey) {
            throw new Error('returned storage key should always match provided storage key for new storage stack');
          }
          this.keyedProxies[newStorageKey] = proxy;
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
      },
      // TODO(sjmiles): alternate render path via slotObserver (UiBroker)
      output: (particle, content) => {
        this.apiPort.Output(particle, content);
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
  private async instantiateParticle(id: string, spec: ParticleSpec, proxies: ReadonlyMap<string, StorageProxy<CRDTTypeRecord>>, reinstantiate: boolean): Promise<[any, () => Promise<void>]> {
    let resolve: Runnable;
    const p = new Promise<void>(res => resolve = res);
    this.pendingLoads.push(p);

    const particle: Particle = await this.createParticleFromSpec(id, spec);

    const handleMap = new Map();

    proxies.forEach((proxy, name) => {
      this.createHandle(particle, spec, id, name, proxy, handleMap);
    });

    return [particle, async () => {
      if (!reinstantiate) {
        particle.onCreate();
      }
      await this.assignHandle(particle, spec, id, handleMap, p);
      resolve();
    }];
  }

  private async reloadParticles(ids: string[]) {
    // Delete old particles' caches
    ids.forEach(id => {
      const oldParticle = this.particles.get(id);
      if (oldParticle.spec.implBlobUrl) delete oldParticle.spec.implBlobUrl;
      if (oldParticle.spec.implFile.endsWith('.wasm') && this.wasmContainers[oldParticle.spec.implFile]) {
        // For WASM particles the container will be re-instantiated along with all of the particles
        this.wasmContainers[oldParticle.spec.implFile] = undefined;
      }
    });

    const result = [];
    // Go through the given array of particles one by one
    for (const id of ids) {
      let resolve: Runnable;
      const p = new Promise<void>(res => resolve = res);
      this.pendingLoads.push(p);

      // Get the old particle
      const oldParticle = this.particles.get(id);

      // Create a new particle and replace the old one
      const particle: Particle = await this.createParticleFromSpec(id, oldParticle.spec);

      const handleMap = new Map();

      const storageList: StorageProxy<CRDTTypeRecord>[] = [];

      for (const oldHandle of oldParticle.handles.values()) {
        const storage = oldHandle.storage as StorageProxy<CRDTTypeRecord>;
        storageList.push(storage);
        await storage.pause();
      }

      // Create new handles and disable the handles of the old particles
      oldParticle.handles.forEach((oldHandle) => {
        this.createHandle(particle, oldParticle.spec, id, oldHandle.name, oldHandle.storage, handleMap);
        oldHandle.disable(oldParticle);
      });

      result.push([particle, async () => {
        // Set the new handles to the new particle
        await this.assignHandle(particle, oldParticle.spec, id, handleMap, p);
        storageList.forEach(storage => storage.unpause());
        resolve();
      }]);
    }
    return result;
  }

  private createHandle(particle: Particle, spec: ParticleSpec, id: string, name: string, proxy: StorageProxy<CRDTTypeRecord>,
                       handleMap) {
    const connSpec = spec.handleConnectionMap.get(name);
    const handle = handleNGFor(id, proxy, this.idGenerator, particle, connSpec.isInput, connSpec.isOutput, name);
    handleMap.set(name, handle);
  }

  private async assignHandle(particle: Particle, spec: ParticleSpec, id: string, handleMap, p) {
    await particle.callSetHandles(handleMap, err => {
      if (typeof err === 'string') {
        err = new Error(err); // Convert to a real error.
      }
      const exc = new UserException(err, 'setHandles', id, spec.name);
      this.apiPort.ReportExceptionInHost(exc);
    });
    const idx = this.pendingLoads.indexOf(p);
    this.pendingLoads.splice(idx, 1);
  }

  private async createParticleFromSpec(id: string, spec: ParticleSpec): Promise<Particle> {
    let particle: Particle;
    if (spec.implFile && spec.implFile.endsWith('.wasm')) {
      particle = await this.loadWasmParticle(id, spec);
      particle.setCapabilities(this.capabilities(false));
    } else {
      const clazz = await this.loader.loadParticleClass(spec);
      particle = new clazz();
      particle.setCapabilities(this.capabilities(true));
    }
    this.particles.set(id, particle);

    return particle;
  }

  private async loadWasmParticle(id: string, spec: ParticleSpec) {
    assert(spec.name.length > 0);

    let container = this.wasmContainers[spec.implFile];
    if (!container) {
      const buffer = await this.loader.loadBinaryResource(spec.implFile);
      if (!buffer || buffer.byteLength === 0) {
        throw new Error(`Failed to load wasm binary '${spec.implFile}'`);
      }

      container = new WasmContainer(this, this.loader, this.apiPort);
      await container.initialize(buffer);
      this.wasmContainers[spec.implFile] = container;
    }

    // Particle constructor expects spec to be attached to the class object (and attaches it to
    // the particle instance at that time).
    WasmParticle.spec = spec;
    const particle = new WasmParticle(id, container);
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
    // TODO(shans): check each proxy's scheduler for busy signal too.
    if (this.pendingLoads.length > 0) {
      return true;
    }
    if ([...this.particles.values()].filter(particle => particle.busy).length > 0) {
      return true;
    }
    return false;
  }

  get idle() {
    if (!this.busy) {
      return Promise.resolve();
    }
    const busyParticlePromises = [...this.particles.values()].filter(particle => particle.busy).map(async particle => particle.idle);
    // TODO(shans): check each proxy's scheduler for idleness too.
    return Promise.all([...this.pendingLoads, ...busyParticlePromises]).then(() => this.idle);
  }
}
