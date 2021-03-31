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
import {ArcInspector, ArcInspectorFactory} from './arc-inspector.js';
import {FakePecFactory} from './fake-pec-factory.js';
import {Id, IdGenerator} from './id.js';
import {Loader} from '../platform/loader.js';
import {CapabilitiesResolver} from './capabilities-resolver.js';
import {Dictionary, Runnable, compareComparables} from '../utils/lib-utils.js';
import {MessagePort} from './message-channel.js';
import {Modality} from './arcs-types/modality.js';
import {ParticleExecutionHost} from './particle-execution-host.js';
import {ParticleSpec} from './arcs-types/particle-spec.js';
import {Particle, Slot, Handle} from './recipe/lib-recipe.js';
import {SlotComposer} from './slot-composer.js';
import {InterfaceType, Type} from '../types/lib-types.js';
import {PecFactory} from './particle-execution-context.js';
import {VolatileMemory, VolatileStorageDriverProvider, VolatileStorageKey} from './storage/drivers/volatile.js';
import {DriverFactory} from './storage/drivers/driver-factory.js';
import {Exists} from './storage/drivers/driver.js';
import {StorageKey} from './storage/storage-key.js';
import {ArcSerializer, ArcInterface} from './arc-serializer.js';
import {ReferenceModeStorageKey} from './storage/reference-mode-storage-key.js';
import {SystemTrace} from '../tracelib/systrace.js';
import {StorageKeyParser} from './storage/storage-key-parser.js';
import {SingletonInterfaceHandle, TypeToCRDTTypeRecord} from './storage/storage.js';
import {StoreInfo} from './storage/store-info.js';
import {ActiveStore} from './storage/active-store.js';
import {StorageService} from './storage/storage-service.js';
import {ArcInfo} from './arc-info.js';
import {Allocator} from './allocator.js';
import {ArcHost} from './arc-host.js';

export type ArcOptions = Readonly<{
  arcInfo: ArcInfo,
  storageService: StorageService;
  pecFactories?: PecFactory[];
  allocator?: Allocator;
  host?: ArcHost;
  slotComposer?: SlotComposer;
  loader: Loader;
  storageKey?: StorageKey;
  stub?: boolean;
  inspectorFactory?: ArcInspectorFactory;
  ports?: MessagePort[];
  modality?: Modality;
  driverFactory: DriverFactory;
  storageKeyParser: StorageKeyParser;
}>;

@SystemTrace
export class Arc implements ArcInterface {
  private readonly pecFactories: PecFactory[];
  public get isSpeculative(): boolean { return this.arcInfo.isSpeculative; }
  public get isInnerArc(): boolean { return this.arcInfo.isInnerArc; }
  public readonly isStub: boolean;
  public _modality: Modality;
  // Public for debug access
  public readonly _loader: Loader;
  private readonly dataChangeCallbacks = new Map<object, Runnable>();
  // storage keys for referenced handles
  public get storeInfoById(): Dictionary<StoreInfo<Type>> { return this.arcInfo.storeInfoById; }
  public readonly storageKey?:  StorageKey;
  public get capabilitiesResolver(): CapabilitiesResolver { return this.arcInfo.capabilitiesResolver; }
  // Map from each store ID to a set of tags. public for debug access
  public get storeTagsById() { return this.arcInfo.storeTagsById; }

  // Map from each store to its description (originating in the manifest).
  get storeDescriptions() { return this.arcInfo.storeDescriptions; }
  private waitForIdlePromise: Promise<void> | null;
  private readonly inspectorFactory?: ArcInspectorFactory;
  public readonly inspector?: ArcInspector;
  readonly innerArcs: Arc[]= [];

  readonly arcInfo: ArcInfo;
  public get id(): Id { return this.arcInfo.id; }
  public get idGenerator(): IdGenerator { return this.arcInfo.idGenerator; }
  loadedParticleInfo = new Map<string, {spec: ParticleSpec, stores: Map<string, StoreInfo<Type>>}>();
  readonly peh: ParticleExecutionHost;

  public readonly storageService: StorageService;
  public readonly driverFactory: DriverFactory;
  public readonly storageKeyParser: StorageKeyParser;

  // Volatile storage local to this Arc instance.
  readonly volatileMemory = new VolatileMemory();
  private readonly volatileStorageDriverProvider: VolatileStorageDriverProvider;

  constructor({arcInfo, storageService, pecFactories, allocator, host, slotComposer, loader, storageKey, stub, inspectorFactory, modality, driverFactory, storageKeyParser} : ArcOptions) {
    this.modality = modality;
    this.driverFactory = driverFactory;
    this.storageKeyParser = storageKeyParser;
    // TODO: pecFactories should not be optional. update all callers and fix here.
    this.pecFactories = pecFactories && pecFactories.length > 0 ? pecFactories.slice() : [FakePecFactory(loader).bind(null)];

    this.arcInfo = arcInfo;
    this.isStub = !!stub;
    this._loader = loader;
    this.inspectorFactory = inspectorFactory;
    this.inspector = inspectorFactory && inspectorFactory.create(this);
    this.storageKey = storageKey;
    const ports = this.pecFactories.map(f => f(this.generateID(), this.idGenerator, this.storageKeyParser));
    this.peh = new ParticleExecutionHost({slotComposer, arc: this, ports, allocator, host});
    this.volatileStorageDriverProvider = new VolatileStorageDriverProvider(this);
    this.driverFactory.register(this.volatileStorageDriverProvider);
    this.storageService = storageService;
    // TODO(sjmiles): currently some UiBrokers need to recover arc from composer in order to forward events
    if (slotComposer && !slotComposer['arc']) {
      slotComposer['arc'] = this.arcInfo;
      slotComposer['peh'] = this.peh;
    }
  }

  get loader(): Loader {
    return this._loader;
  }

  set modality(modality: Modality) {
    this._modality = modality;
  }

  get modality(): Modality {
    let modalities = [];
    if (this._modality) {
      modalities.push(this._modality);
    }
    // TODO(sjmiles): Modality rules are unclear. Seems to me the Arc should declare it's own modality
    // but many tests fail without these conditionals. Note that a Modality can represent a set of modalities.
    if (!this.activeRecipe.isEmpty()) {
      modalities.push(this.activeRecipe.modality);
    }
    if (!modalities.length) {
      modalities = this.context.allRecipes.map(recipe => recipe.modality);
    }
    return Modality.union(modalities);
  }

  dispose(): void {
    // TODO: disconnect all associated store event handlers
    this.peh.stop();
    this.peh.close();
    // Slot contexts and consumers from inner and outer arcs can be interwoven. Slot composer
    // is therefore disposed in its entirety with an outer Arc's disposal.
    if (!this.isInnerArc && this.peh.slotComposer) {
      this.peh.slotComposer.dispose();
    }

    this.driverFactory.unregister(this.volatileStorageDriverProvider);
  }

  // Returns a promise that spins sending a single `AwaitIdle` message until it
  // sees no other messages were sent.
  async _waitForIdle(): Promise<void> {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const messageCount = this.peh.messageCount;
      const innerArcsLength = this.innerArcs.length;

      // tslint:disable-next-line: no-any
      await Promise.all([this.peh.idle as Promise<any>, ...this.innerArcs.map(async arc => arc.idle)]);

      // We're idle if no new inner arcs appeared and this.pec had exactly 2 messages,
      // one requesting the idle status, and one answering it.
      if (this.innerArcs.length === innerArcsLength
        && this.peh.messageCount === messageCount + 2) break;
    }
  }

  // Work around a bug in the way we track idleness. It could be:
  // - in the new storage stack
  // - in DomMultiplexer
  // - in the idleness detection code.
  get idle(): Promise<void> {
    return this._idle.then(async () => this._idle);
  }

  get _idle(): Promise<void> {
    if (this.waitForIdlePromise) {
      return this.waitForIdlePromise;
    }
    // Store one active completion promise for use by any subsequent callers.
    // We explicitly want to avoid, for example, multiple simultaneous
    // attempts to identify idle state each sending their own `AwaitIdle`
    // message and expecting settlement that will never arrive.
    const promise =
      this._waitForIdle().then(() => this.waitForIdlePromise = null);
    this.waitForIdlePromise = promise;
    return promise;
  }

  addInnerArc(innerArc: Arc) {
    this.innerArcs.push(innerArc);
  }

  async serialize(): Promise<string> {
    await this.idle;
    return new ArcSerializer(this).serialize();
  }

  // Writes `serialization` to the ArcInfo child key under the Arc's storageKey.
  // This does not directly use serialize() as callers may want to modify the
  // contents of the serialized arc before persisting.
  async persistSerialization(serialization: string): Promise<void> {
    throw new Error('persistSerialization unimplemented, pending synthetic type support in new storage stack');
  }

  get context() {
    return this.arcInfo.context;
  }

  get activeRecipe() { return this.arcInfo.activeRecipe; }
  get recipeDeltas() { return this.arcInfo.recipeDeltas; }

  loadedParticleSpecs() {
    return [...this.loadedParticleInfo.values()].map(({spec}) => spec);
  }

  async _instantiateParticle(recipeParticle: Particle, reinstantiate: boolean) {
    if (!recipeParticle.id) {
      recipeParticle.id = this.generateID('particle');
    }
    const info = await this._getParticleInstantiationInfo(recipeParticle);
    await this.peh.instantiate(recipeParticle, info.stores, info.storeMuxers, reinstantiate);
  }

  async _getParticleInstantiationInfo(recipeParticle: Particle): Promise<{spec: ParticleSpec, stores: Map<string, StoreInfo<Type>>, storeMuxers: Map<string, StoreInfo<Type>>}> {
    const info = {spec: recipeParticle.spec, stores: new Map<string, StoreInfo<Type>>(), storeMuxers: new Map<string, StoreInfo<Type>>()};
    this.loadedParticleInfo.set(recipeParticle.id.toString(), info);

    // if supported, provide particle caching via a BlobUrl representing spec.implFile
    await this._provisionSpecUrl(recipeParticle.spec);

    for (const [name, connection] of Object.entries(recipeParticle.connections)) {
      if (connection.handle.fate !== '`slot') {
        const store = this.findStoreById(connection.handle.id);
        assert(store, `can't find store of id ${connection.handle.id}`);
        assert(info.spec.handleConnectionMap.get(name) !== undefined, 'can\'t connect handle to a connection that doesn\'t exist');
        if (store.isMuxEntityStore()) {
          info.storeMuxers.set(name, store);
        } else {
          info.stores.set(name, store);
        }
      }
    }
    return info;
  }

  private async _provisionSpecUrl(spec: ParticleSpec): Promise<void> {
    // if supported, construct spec.implBlobUrl for spec.implFile
    if (spec.implFile && !spec.implBlobUrl) {
      if (this.loader) {
        const url = await this.loader.provisionObjectUrl(spec.implFile);
        if (url) {
          spec.setImplBlobUrl(url);
        }
      }
    }
  }

  generateID(component: string = ''): Id {
    return this.arcInfo.generateID(component);
  }

  get stores(): StoreInfo<Type>[] {
    return this.arcInfo.stores;
  }

  async getActiveStore<T extends Type>(storeInfo: StoreInfo<T>): Promise<ActiveStore<TypeToCRDTTypeRecord<T>>> {
    return this.storageService.getActiveStore(storeInfo);
  }

  // Makes a copy of the arc used for speculative execution.
  async cloneForSpeculativeExecution(): Promise<Arc> {
    const arcInfo = await this.peh.allocator.startArc({arcId: this.generateID(), outerArcId: this.arcInfo.outerArcId, isSpeculative: true});
    const storeMap: Map<StoreInfo<Type>, StoreInfo<Type>> = new Map();
    for (const storeInfo of this.arcInfo.stores) {
      // TODO(alicej): Should we be able to clone a StoreMux as well?
      const cloneInfo = await arcInfo.createStoreInfo(storeInfo.type, {
        storageKey: new VolatileStorageKey(this.id, storeInfo.id),
        exists: Exists.MayExist,
        id: storeInfo.id
      });
      storeMap.set(storeInfo, cloneInfo);
      if (this.storeDescriptions.has(storeInfo)) {
        arcInfo.storeDescriptions.set(cloneInfo, this.storeDescriptions.get(storeInfo));
      }
    }

    await this.peh.allocator.runPlanInArc(arcInfo, this.activeRecipe.clone());
    const arc = this.peh.host.getArcById(arcInfo.id);

    for (const innerArc of this.innerArcs) {
      arc.addInnerArc(await innerArc.cloneForSpeculativeExecution());
    }

    return arc;
  }

  /**
   * Instantiates the given recipe in the Arc.
   *
   * Executes the following steps:
   *
   * - Populates missing slots.
   * - Processes the Handles and creates stores for them.
   * - Instantiates the new Particles
   * - Passes these particles for initialization in the PEC
   *
   * Waits for completion of an existing Instantiate before returning.
   */
  async instantiate({particles, handles}: {particles: Particle[], handles: Handle[]}, reinstantiate: boolean = false): Promise<void> {
    // Create handles, as needed.
    for (const recipeHandle of handles) {
      const fate = recipeHandle.originalFate && recipeHandle.originalFate !== '?'
          ? recipeHandle.originalFate : recipeHandle.fate;
      const newStore = this.storeInfoById[recipeHandle.id];
      assert(newStore);

      if (recipeHandle.immediateValue) {
        const particleSpec = recipeHandle.immediateValue;
        const type = recipeHandle.type;
        if (newStore.isSingletonInterfaceStore()) {
          assert(type instanceof InterfaceType && type.interfaceInfo.particleMatches(particleSpec));
          await this.getActiveStore(newStore);
          const handle: SingletonInterfaceHandle = await this.storageService.handleForStoreInfo(
              newStore, this.arcInfo.generateID().toString(), this.arcInfo.idGenerator, {ttl: recipeHandle.getTtl()}) as SingletonInterfaceHandle;
          await handle.set(particleSpec.clone());
        } else {
          throw new Error(`Can't currently store immediate values in non-singleton stores`);
        }
        continue;
      }

      if (!['copy', 'map', 'create'].includes(fate)) {
        continue;
      }

      if (fate === 'map') {
        await this.createActiveStore(newStore);
      } else {
        await this.createStoreInternal(newStore);
        if (fate === 'copy') {
          const copiedStoreRef = this.context.findStoreById(recipeHandle.originalId);
          const copiedActiveStore = await this.getActiveStore(copiedStoreRef);
          assert(copiedActiveStore, `Cannot find store ${recipeHandle.originalId}`);
          const activeStore = await this.getActiveStore(newStore);
          await activeStore.cloneFrom(copiedActiveStore);
        }
      }
    }

    await Promise.all(particles.map(recipeParticle => this._instantiateParticle(recipeParticle, reinstantiate)));
    if (this.inspector) {
      await this.inspector.recipeInstantiated(particles, this.activeRecipe.toString());
    }
  }

  private async createStoreInternal<T extends Type>(storeInfo: StoreInfo<T>): Promise<void> {
    await this.createActiveStore(storeInfo);

    if (storeInfo.storageKey instanceof ReferenceModeStorageKey) {
      const containerStoreInfo = this.arcInfo.findStoreInfoByStorageKey(storeInfo.storageKey.storageKey);
      assert(containerStoreInfo);
      await this.createStoreInternal(containerStoreInfo);
      const backingStoreInfo = this.arcInfo.findStoreInfoByStorageKey(storeInfo.storageKey.backingKey);
      assert(backingStoreInfo);
      await this.createStoreInternal(backingStoreInfo);
    }
  }

  private async createActiveStore(store: StoreInfo<Type>): Promise<void> {
    const activeStore = await this.getActiveStore(store);
    activeStore.on(async () => this._onDataChange());
  }

  _onDataChange(): void {
    for (const callback of this.dataChangeCallbacks.values()) {
      callback();
    }
  }

  onDataChange(callback: Runnable, registration: object): void {
    this.dataChangeCallbacks.set(registration, callback);
  }

  clearDataChange(registration: object): void {
    this.dataChangeCallbacks.delete(registration);
  }

  findStoresByType<T extends Type>(type: T, options?: {tags: string[]}): StoreInfo<T>[] {
    return this.arcInfo.findStoresByType(type, options);
  }

  findStoreById(id: string): StoreInfo<Type> {
    return this.arcInfo.findStoreById(id);
  }

  getVersionByStore({includeArc=true, includeContext=false}) {
    const versionById = {};
    if (includeArc) {
      for (const id of Object.keys(this.storeInfoById)) {
        versionById[id] = this.storeInfoById[id].versionToken;
      }
    }
    if (includeContext) {
      this.context.allStores.forEach(handle => versionById[handle.id] = handle.versionToken);
    }
    return versionById;
  }

  toContextString(): string {
    const results: string[] = [];
    const storeInfos = Object.values(this.storeInfoById).sort(compareComparables);
    storeInfos.forEach(storeInfo => {
      results.push(storeInfo.toManifestString({handleTags: [...this.storeTagsById[storeInfo.id]]}));
    });

    // TODO: include stores entities
    // TODO: include (remote) slots?

    if (!this.activeRecipe.isEmpty()) {
      results.push(this.activeRecipe.toString());
    }

    return results.join('\n');
  }

  get apiChannelMappingId() {
    return this.id.toString();
  }
}
