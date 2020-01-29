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
import {UnifiedStore} from './storageNG/unified-store.js';
import {Runnable} from './hot.js';
import {Manifest} from './manifest.js';
import {StorageStub} from './storage-stub.js';
import {MessagePort} from './message-channel.js';
import {Handle} from './recipe/handle.js';
import {Particle} from './recipe/particle.js';
import {RecipeResolver} from './recipe/recipe-resolver.js';
import {SlotComposer} from './slot-composer.js';
import {BigCollectionStorageProvider, CollectionStorageProvider, SingletonStorageProvider, StorageProviderBase} from './storage/storage-provider-base.js';
import {Type} from './type.js';
import {Services} from './services.js';
import {floatingPromiseToAudit} from './util.js';
import {Arc} from './arc.js';
import {CRDTTypeRecord} from './crdt/crdt.js';
import {ProxyMessage, Store} from './storageNG/store.js';
import {Flags} from './flags.js';
import {StorageKey} from './storageNG/storage-key.js';
import {VolatileStorageKey} from './storageNG/drivers/volatile.js';
import {NoTrace, SystemTrace} from '../tracelib/systrace.js';
import {Client, getClientClass} from '../tracelib/systrace-clients.js';
import {Exists} from './storageNG/drivers/driver.js';
import {StorageKeyParser} from './storageNG/storage-key-parser.js';

export type ParticleExecutionHostOptions = Readonly<{
  slotComposer: SlotComposer;
  arc: Arc;
  ports: MessagePort[];
}>;

@SystemTrace
export class ParticleExecutionHost {
  private readonly _apiPorts: PECOuterPort[];
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
      this._apiPorts.forEach(apiPort => apiPort.close());
    };
    this.arc = arc;
    this.slotComposer = slotComposer;
    this._apiPorts = ports.map(port => new PECOuterPortImpl(port, arc));
  }

  private choosePortForParticle(particle: Particle): PECOuterPort {
    assert(!this._portByParticle.has(particle), `port already found for particle '${particle.spec.name}'`);
    const port = this._apiPorts.find(port => particle.isExternalParticle() === port.supportsExternalParticle());
    assert(!!port, `No port found for '${particle.spec.name}'`);
    this._portByParticle.set(particle, port);
    return this.getPort(particle);
  }

  private getPort(particle: Particle): PECOuterPort {
    assert(this._portByParticle.has(particle), `Cannot get port for particle '${particle.spec.name}'`);
    return this._portByParticle.get(particle);
  }

  stop() {
    this._apiPorts.forEach(apiPort => apiPort.Stop());
  }

  get idle(): Promise<Map<Particle, number[]>> | undefined {
    if (this.idlePromise == undefined) {
      this.idlePromise = new Promise((resolve, reject) => {
        this.idleResolve = resolve;
      });
    }
    this.idleVersion = this.nextIdentifier;
    this._apiPorts.forEach(apiPort => apiPort.AwaitIdle(this.nextIdentifier++));
    return this.idlePromise;
  }

  get messageCount(): number {
    return [...this._apiPorts.values()].map(apiPort => apiPort.messageCount).reduce((prev, current) => prev + current, 0);
  }

  sendEvent(particle, slotName, event): void {
    this.getPort(particle).UIEvent(particle, slotName, event);
  }

  instantiate(particle: Particle, stores: Map<string, UnifiedStore>): void {
    this.particles.push(particle);
    const apiPort = this.choosePortForParticle(particle);
    stores.forEach((store, name) => {
      apiPort.DefineHandle(
          store,
          store.type.resolvedType(),
          name,
          store.storageKey.toString(),
          particle.getConnectionByName(name).handle.ttl);
    });
    apiPort.InstantiateParticle(particle, particle.id.toString(), particle.spec, stores);
  }

  reinstantiate(particle: Particle, stores: Map<string, UnifiedStore>): void {
    assert(this.particles.find(p => p === particle),
           `Cannot reinstantiate nonexistent particle ${particle.name}`);
    const apiPort = this.getPort(particle);
    stores.forEach((store, name) => {
      apiPort.DefineHandle(
          store,
          store.type.resolvedType(),
          name,
          store.storageKey.toString(),
          particle.getConnectionByName(name).handle.ttl);
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

  constructor(port, arc: Arc) {
    super(port, arc);
    this.arc = arc;

    const clientClass = getClientClass();
    if (clientClass) {
      this.systemTraceClient = new clientClass();
    }
  }

  onInitializeProxy(handle: StorageProviderBase, callback: number) {
    const target = {};
    handle.legacyOn(data => this.SimpleCallback(callback, data));
  }

  async onSynchronizeProxy(handle: StorageProviderBase, callback: number) {
    const data = await handle.modelForSynchronization();
    this.SimpleCallback(callback, data);
  }

  async onHandleGet(handle: StorageProviderBase, callback: number): Promise<void> {
    const data = await (handle as SingletonStorageProvider).get();
    this.SimpleCallback(callback, data);
  }

  async onHandleToList(handle: StorageProviderBase, callback: number) {
    const data = await (handle as CollectionStorageProvider).toList();
    this.SimpleCallback(callback, data);
  }

  onHandleSet(handle: StorageProviderBase, data: {}, particleId: string, barrier: string) {
    // TODO: Awaiting this promise causes tests to fail...
    floatingPromiseToAudit((handle as SingletonStorageProvider).set(data, particleId, barrier));
  }

  onHandleClear(handle: StorageProviderBase, particleId: string, barrier: string) {
    // TODO: Awaiting this promise causes tests to fail...
    floatingPromiseToAudit((handle as SingletonStorageProvider).clear(particleId, barrier));
  }

  async onHandleStore(handle: StorageProviderBase, callback: number, data: {value: {}, keys: string[]}, particleId: string) {
    // TODO(shans): fix typing once we have types for Singleton/Collection/etc
    // tslint:disable-next-line: no-any
    await (handle as CollectionStorageProvider).store(data.value, data.keys, particleId);
    this.SimpleCallback(callback, {});
  }

  async onHandleRemove(handle: StorageProviderBase, callback: number, data: {id: string, keys: string[]}, particleId) {
    // TODO(shans): fix typing once we have types for Singleton/Collection/etc
    // tslint:disable-next-line: no-any
    await (handle as CollectionStorageProvider).remove(data.id, data.keys, particleId);
    this.SimpleCallback(callback, {});
  }

  async onHandleRemoveMultiple(handle: StorageProviderBase, callback: number, data: [], particleId: string) {
    await (handle as CollectionStorageProvider).removeMultiple(data, particleId);
    this.SimpleCallback(callback, {});
  }

  async onHandleStream(handle: StorageProviderBase, callback: number, pageSize: number, forward: boolean) {
    this.SimpleCallback(callback, await (handle as BigCollectionStorageProvider).stream(pageSize, forward));
  }

  async onStreamCursorNext(handle: StorageProviderBase, callback: number, cursorId: number) {
    this.SimpleCallback(callback, await (handle as BigCollectionStorageProvider).cursorNext(cursorId));
  }

  onStreamCursorClose(handle: StorageProviderBase, cursorId: number) {
    (handle as BigCollectionStorageProvider).cursorClose(cursorId);
  }

  async onRegister(store: Store<CRDTTypeRecord>, messagesCallback: number, idCallback: number) {
    // Need an ActiveStore here to listen to changes. Calling .activate() should
    // generally be a no-op.
    const id = (await store.activate()).on(async data => {
      this.SimpleCallback(messagesCallback, data);
      return Promise.resolve(true);
    });
    this.SimpleCallback(idCallback, id);
  }

  async onProxyMessage(store: Store<CRDTTypeRecord>, message: ProxyMessage<CRDTTypeRecord>, callback: number) {
    // Need an ActiveStore here in order to forward messages. Calling
    // .activate() should generally be a no-op.
    if (!(store instanceof Store)) {
      this.onReportExceptionInHost(new SystemException(new Error('expected new-style store but found old-style store hooked up to new stack'), 'onProxyMessage', ''));
      return;
    }
    const res = await (await store.activate()).onProxyMessage(message);
    this.SimpleCallback(callback, res);
  }

  onIdle(version: number, relevance: Map<Particle, number[]>) {
    this.arc.pec.resolveIfIdle(version, relevance);
  }

  async onGetBackingStore(callback: number, storageKey: string, type: Type) {
    let store;
    if (Flags.useNewStorageStack) {
      if (!storageKey) {
        // TODO(shanestephens): What should we do here?!
        throw new Error(`Don't know how to invent new storage keys for new storage stack when we only have type information`);
      }
      const key = StorageKeyParser.parse(storageKey);
      // TODO(shanestephens): We could probably register the active store here, but at the moment onRegister and onProxyMessage both
      // expect to be able to do activation
      const storeBase = new Store({id: storageKey, exists: Exists.MayExist, storageKey: key, type});
      this.GetBackingStoreCallback(storeBase, callback, type, type.toString(), storageKey, storageKey);
    } else {
      if (!storageKey) {
        // XXX
        storageKey = this.arc.storageProviderFactory.baseStorageKey(type, this.arc.storageKey as string || 'volatile');
      }
      store = await this.arc.storageProviderFactory.baseStorageFor(type, storageKey);
      // TODO(shans): THIS IS NOT SAFE!
      //
      // Without an auditor on the runtime side that inspects what is being fetched from
      // this store, particles with a reference can access any data of that reference's type.
      //
      // TOODO(sjmiles): randomizing the id as a workaround for https://github.com/PolymerLabs/arcs/issues/2936
      const twiddledId = `${store.id}:${`String(Math.random())`.slice(2, 9)}`;
      this.GetBackingStoreCallback(store, callback, type.collectionOf(), type.toString(), twiddledId, storageKey);
    }
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
    let storageKey: string | StorageKey;
    if (Flags.useNewStorageStack) {
      // TODO(shans): should this have a well defined id?
      storageKey = new VolatileStorageKey(arc.id, String(Math.random()));
    } else {
      storageKey = 'volatile';
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
    if (this.arc.pec.slotComposer) {
      hostedSlotId = this.arc.pec.slotComposer.createHostedSlot(arc, transformationParticle, transformationSlotName, handleId);
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
      let recipe0 = manifest.recipes[0];
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
                  await arc.createStore(handle.type, handle.localName, handle.id, handle.tags, handle.storageKey);
                }
              }

              // TODO: pass tags through too, and reconcile with similar logic
              // in Arc.deserialize.
              for (const store of manifest.stores) {
                if (store instanceof StorageStub) {
                  await this.arc._registerStore(await store.inflate(), []);
                } else {
                  await this.arc._registerStore(store, []);
                }
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
    const composer = this.arc.pec.slotComposer;
    if (composer && composer['delegateOutput']) {
      composer['delegateOutput'](this.arc, particle, content);
    }
  }

  onReportExceptionInHost(exception: PropagatedException) {
    if (!exception.particleName && exception.particleId) {
      exception.particleName = this.arc.loadedParticleInfo.get(exception.particleId).spec.name;
    }
    reportSystemException(exception);
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
