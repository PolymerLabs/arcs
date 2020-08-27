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

import {PECOuterPort} from './api-channel.js';
import {reportSystemException, PropagatedException, SystemException} from './arc-exceptions.js';
import {AbstractStore} from './storage/abstract-store.js';
import {Runnable} from '../utils/hot.js';
import {Manifest} from './manifest.js';
import {MessagePort} from './message-channel.js';
import {Particle, Handle, Recipe} from './recipe/lib-recipe.js';
import {RecipeResolver} from './recipe/recipe-resolver.js';
import {SlotComposer} from './slot-composer.js';
import {Type, EntityType, ReferenceType, InterfaceType, SingletonType, MuxType} from './type.js';
import {Services} from './services.js';
import {floatingPromiseToAudit, noAwait} from './util.js';
import {Arc} from './arc.js';
import {CRDTTypeRecord} from './crdt/crdt.js';
import {ProxyMessage, Store, StoreMuxer} from './storage/store.js';
import {VolatileStorageKey} from './storage/drivers/volatile.js';
import {NoTrace, SystemTrace} from '../tracelib/systrace.js';
import {Client, getClientClass} from '../tracelib/systrace-clients.js';
import {Exists} from './storage/drivers/driver.js';
import {StorageKeyParser} from './storage/storage-key-parser.js';
import {CRDTMuxEntity} from './storage/storage.js';

export type ParticleExecutionHostOptions = Readonly<{
  slotComposer: SlotComposer;
  arc: Arc;
  ports: MessagePort[];
}>;

@SystemTrace
export class ParticleExecutionHost {
  private readonly apiPorts: PECOuterPort[];
  private readonly _portByParticle = new Map<Particle, PECOuterPort>();
  close : Runnable;
  private readonly arc: Arc;
  private nextIdentifier = 0;
  public readonly slotComposer: SlotComposer;
  private idleVersion = 0;
  private idlePromise: Promise<Map<Particle, number[]>> | undefined;
  private idleResolve: ((relevance: Map<Particle, number[]>) => void) | undefined;
  public readonly particles: Particle[] = [];

  constructor({slotComposer, arc, ports}: ParticleExecutionHostOptions) {
    this.close = () => {
      this.apiPorts.forEach(apiPort => apiPort.close());
    };
    this.arc = arc;
    this.slotComposer = slotComposer;
    this.apiPorts = ports.map(port => new PECOuterPortImpl(port, arc));
  }

  private choosePortForParticle(particle: Particle): PECOuterPort {
    assert(!this._portByParticle.has(particle), `port already found for particle '${particle.spec.name}'`);
    const port = this.apiPorts.find(port => particle.isExternalParticle() === port.supportsExternalParticle());
    assert(!!port, `No port found for '${particle.spec.name}'`);
    this._portByParticle.set(particle, port);
    return this.getPort(particle);
  }

  private getPort(particle: Particle): PECOuterPort {
    assert(this._portByParticle.has(particle), `Cannot get port for particle '${particle.spec.name}'`);
    return this._portByParticle.get(particle);
  }

  stop() {
    this.apiPorts.forEach(apiPort => apiPort.Stop());
  }

  get idle(): Promise<Map<Particle, number[]>> | undefined {
    if (this.idlePromise == undefined) {
      this.idlePromise = new Promise((resolve, reject) => {
        this.idleResolve = resolve;
      });
    }
    this.idleVersion = this.nextIdentifier;
    this.apiPorts.forEach(apiPort => apiPort.AwaitIdle(this.nextIdentifier++));
    return this.idlePromise;
  }

  get messageCount(): number {
    return [...this.apiPorts.values()].map(apiPort => apiPort.messageCount).reduce((prev, current) => prev + current, 0);
  }

  sendEvent(particle, slotName, event): void {
    this.getPort(particle).UIEvent(particle, slotName, event);
  }

  instantiate(particle: Particle, stores: Map<string, AbstractStore>, storeMuxers: Map<string, AbstractStore>, reinstantiate: boolean): void {
    this.particles.push(particle);
    const apiPort = this.choosePortForParticle(particle);
    stores.forEach((store, name) => {
      apiPort.DefineHandle(
          store,
          store.type.resolvedType(),
          name,
          store.storageKey.toString(),
          particle.getConnectionByName(name).handle.getTtl());
    });
    storeMuxers.forEach((storeMuxer, name) => {
      apiPort.DefineHandleFactory(
        storeMuxer,
        storeMuxer.type.resolvedType(),
        name,
        storeMuxer.storageKey.toString(),
        particle.getConnectionByName(name).handle.getTtl()
      );
    });
    apiPort.InstantiateParticle(particle, particle.id.toString(), particle.spec, stores, storeMuxers, reinstantiate);
  }

  reinstantiate(particle: Particle, stores: Map<string, AbstractStore>): void {
    assert(this.particles.find(p => p === particle),
           `Cannot reinstantiate nonexistent particle ${particle.name}`);
    this.apiPorts.forEach(apiPort => { apiPort.clear(); });
    const apiPort = this.getPort(particle);
    stores.forEach((store, name) => {
      apiPort.DefineHandle(store, store.type.resolvedType(), name, store.storageKey.toString(), particle.getConnectionByName(name).handle.getTtl());
    });
    apiPort.ReinstantiateParticle(particle.id.toString(), particle.spec, stores);
  }

  reload(particles: Particle[]) {
    // Create a mapping from port to given list of particles
    const portMap = new Map<PECOuterPort, Particle[]>();
    particles.forEach(particle => {
      const port = this.getPort(particle);
      let list: Particle[] = portMap.get(port);
      if (!list) {
        list = [particle];
        portMap.set(port, list);
      } else {
        list.push(particle);
      }
    });

    // Reload particles based on ports
    portMap.forEach((particles: Particle[], port: PECOuterPort) => {
      port.ReloadParticles(particles, particles.map(p => p.id.toString()));
    });
  }

  resolveIfIdle(version: number, relevance: Map<Particle, number[]>) {
    if (version === this.idleVersion) {
      this.idlePromise = undefined;
      this.idleResolve(relevance);
    }
  }
}

class PECOuterPortImpl extends PECOuterPort {
  arc: Arc;
  readonly systemTraceClient: Client | undefined;
  storageListenerRemovalCallbacks: Function[] = [];

  constructor(port, arc: Arc) {
    super(port, arc);
    this.arc = arc;

    const clientClass = getClientClass();
    if (clientClass) {
      this.systemTraceClient = new clientClass();
    }
  }

  // Should be called when closing apiPorts or re-instantiating particles to
  // clean up stale resources such as registered storage listeners, etc.
  clear() {
    this.storageListenerRemovalCallbacks.forEach(cb => { cb(); });
  }

  async onRegister(store: Store<CRDTTypeRecord>, messagesCallback: number, idCallback: number) {
    // Need an ActiveStore here to listen to changes. Calling .activate() should
    // generally be a no-op.
    // TODO: add listener removal callback to storageListenerRemovalCallbacks
    //       for StorageNG if necessary.
    const id = (await store.activate()).on(async data => {
      this.SimpleCallback(messagesCallback, data);
    });
    this.SimpleCallback(idCallback, id);
  }

  async onDirectStoreMuxerRegister(store: StoreMuxer<CRDTMuxEntity>, messagesCallback: number, idCallback: number) {
    const id = (await store.activate()).on(async data => {
      this.SimpleCallback(messagesCallback, data);
    });
    this.SimpleCallback(idCallback, id);
  }

  async onProxyMessage(store: Store<CRDTTypeRecord>, message: ProxyMessage<CRDTTypeRecord>) {
    // Need an ActiveStore here in order to forward messages. Calling
    // .activate() should generally be a no-op.
    if (!(store instanceof Store)) {
      this.onReportExceptionInHost(new SystemException(new Error('expected new-style store but found old-style store hooked up to new stack'), 'onProxyMessage', ''));
      return;
    }
    noAwait((await store.activate()).onProxyMessage(message));
  }

  async onStorageProxyMuxerMessage(store: StoreMuxer<CRDTMuxEntity>, message: ProxyMessage<CRDTMuxEntity>) {
    if (!(store instanceof StoreMuxer)) {
      this.onReportExceptionInHost(new SystemException(new Error('expected DirectStoreMuxer for onStorageProxyMuxerMessage'), 'onStorageProxyMuxerMessage', ''));
      return;
    }
    noAwait((await store.activate()).onProxyMessage(message));
  }

  onIdle(version: number, relevance: Map<Particle, number[]>) {
    this.arc.peh.resolveIfIdle(version, relevance);
  }

  async onGetDirectStoreMuxer(callback: number, storageKey: string, type: MuxType<EntityType>) {
    if (!storageKey) {
      // TODO(shanestephens): What should we do here?!
      throw new Error(`Don't know how to invent new storage keys for new storage stack when we only have type information`);
    }
    const key = StorageKeyParser.parse(storageKey);
    const storeMuxerBase = new StoreMuxer(type, {id: storageKey, exists: Exists.MayExist, storageKey: key});
    this.GetDirectStoreMuxerCallback(storeMuxerBase, callback, type, type.toString(), storageKey, storageKey);
  }

  onConstructInnerArc(callback: number, particle: Particle) {
    const arc = this.arc.createInnerArc(particle);
    this.ConstructArcCallback(callback, arc);
  }

  async onArcCreateHandle(callback: number, arc: Arc, type: Type, name: string) {
    // At the moment, inner arcs are not persisted like their containers, but are instead
    // recreated when an arc is deserialized. As a consequence of this, dynamically
    // created handles for inner arcs must always be volatile to prevent storage
    // in firebase.
    const storageKey = new VolatileStorageKey(arc.id, String(Math.random()));

    // TODO(shanestephens): Remove this once singleton types are expressed directly in recipes.
    if (type instanceof EntityType || type instanceof ReferenceType || type instanceof InterfaceType) {
      type = new SingletonType(type);
    }

    const store = await arc.createStore(type, name, null, [], storageKey);
    // Store belongs to the inner arc, but the transformation particle,
    // which itself is in the outer arc gets access to it.
    this.CreateHandleCallback(store, callback, store.type, name, store.id);
  }

  onArcMapHandle(callback: number, arc: Arc, handle: Handle) {
    assert(this.arc.findStoreById(handle.id), `Cannot map nonexistent handle ${handle.id}`);
    // TODO: create hosted handles map with specially generated ids instead of returning the real ones?
    this.MapHandleCallback({}, callback, handle.id);
  }

  onArcCreateSlot(callback: number, arc: Arc, transformationParticle: Particle, transformationSlotName: string, handleId: string) {
    let hostedSlotId;
    if (this.arc.peh.slotComposer) {
      hostedSlotId = this.arc.peh.slotComposer.createHostedSlot(arc, transformationParticle, transformationSlotName, handleId);
    }
    this.CreateSlotCallback({}, callback, hostedSlotId);
  }

  async onArcLoadRecipe(arc: Arc, recipe: string, callback: number) {
    try {
      const manifest = await Manifest.parse(recipe, {loader: arc.loader, fileName: ''});
      const successResponse = {
        providedSlotIds: {}
      };
      let error = undefined;
      // TODO(wkorman): Consider reporting an error or at least warning if
      // there's more than one recipe since currently we silently ignore them.
      let recipe0: Recipe = manifest.recipes[0];
      if (recipe0) {
        for (const slot of recipe0.slots) {
          slot.id = slot.id || arc.generateID('slot').toString();
          if (slot.sourceConnection) {
            const particlelocalName = slot.sourceConnection.particle.localName;
            if (particlelocalName) {
              successResponse.providedSlotIds[`${particlelocalName}.${slot.name}`] = slot.id;
            }
          }
        }
        const missingHandles: Handle[] = [];
        for (const handle of recipe0.handles) {
          const fromHandle = this.arc.findStoreById(handle.id) || manifest.findStoreById(handle.id);
          if (fromHandle) {
            handle.mapToStorage(fromHandle);
          } else {
            missingHandles.push(handle);
            continue;
          }
        }
        if (missingHandles.length > 0) {
          let recipeToResolve = recipe0;
          // We're resolving both against the inner and the outer arc.
          for (const resolver of [new RecipeResolver(arc /* inner */), new RecipeResolver(this.arc /* outer */)]) {
            recipeToResolve = await resolver.resolve(recipeToResolve) || recipeToResolve;
          }
          if (recipeToResolve === recipe0) {
            error = `Recipe couldn't load due to missing handles [recipe=${recipe0}, missingHandles=${missingHandles.join('\n')}].`;
          } else {
            recipe0 = recipeToResolve;
          }
        }
        if (!error) {
          const options = {errors: new Map()};
          // If we had missing handles but we made it here, then we ran recipe
          // resolution which will have already normalized the recipe.
          if ((missingHandles.length > 0) || recipe0.normalize(options)) {
            if (recipe0.isResolved()) {
              // Map handles from the external environment that aren't yet in the inner arc.
              // TODO(shans): restrict these to only the handles that are listed on the particle.
              for (const handle of recipe0.handles) {
                if (!arc.findStoreById(handle.id)) {
                  let type = handle.type;
                  // TODO(shanestephens): Remove this once singleton types are expressed directly in recipes.
                  if (type instanceof EntityType || type instanceof InterfaceType || type instanceof ReferenceType) {
                    type = new SingletonType(type);
                  }
                  await arc.createStore(type, handle.localName, handle.id, handle.tags, handle.storageKey);
                }
              }

              // TODO: pass tags through too, and reconcile with similar logic
              // in Arc.deserialize.
              for (const store of manifest.stores) {
                await this.arc._registerStore(store, []);
              }
              // TODO: Awaiting this promise causes tests to fail...
              const instantiateAndCaptureError = async () => {
                try {
                  await arc.instantiate(recipe0);
                } catch (e) {
                  this.SimpleCallback(callback, {error: e.message + e.stack});
                }
              };
              floatingPromiseToAudit(instantiateAndCaptureError());
            } else {
              error = `Recipe is not resolvable:\n${recipe0.toString({showUnresolved: true})}`;
            }
          } else {
            error = `Recipe ${recipe0} could not be normalized:\n${[...options.errors.values()].join('\n')}`;
          }
        }
      } else {
        error = 'No recipe defined';
      }
      this.SimpleCallback(callback, error ? {error} : successResponse);
    } catch (e) {
      this.SimpleCallback(callback, {error: e.message + e.stack});
    }
  }

  onOutput(particle: Particle, content: {}) {
    const composer = this.arc.peh.slotComposer;
    if (composer && composer['delegateOutput']) {
      composer['delegateOutput'](this.arc, particle, content);
    }
  }

  onReportExceptionInHost(exception: PropagatedException) {
    if (!exception.particleName && exception.particleId) {
      exception.particleName = this.arc.loadedParticleInfo.get(exception.particleId).spec.name;
    }
    reportSystemException(this.arc, exception);
  }

  async onServiceRequest(particle: Particle, request: {}, callback: number): Promise<void> {
    const response = await Services.request(request);
    this.SimpleCallback(callback, response);
  }

  @NoTrace
  onSystemTraceBegin(tag: string, cookie: number) {
    if (this.systemTraceClient) {
      this.systemTraceClient.asyncTraceBegin(tag, cookie);
    }
  }

  @NoTrace
  onSystemTraceEnd(tag: string, cookie: number) {
    if (this.systemTraceClient) {
      this.systemTraceClient.asyncTraceEnd(tag, cookie);
    }
  }
}
