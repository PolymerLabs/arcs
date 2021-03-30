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
import {Capabilities} from './capabilities.js';
import {CapabilitiesResolver} from './capabilities-resolver.js';
import {Dictionary, Runnable, compareComparables, Mutex} from '../utils/lib-utils.js';
import {Manifest} from './manifest.js';
import {MessagePort} from './message-channel.js';
import {Modality} from './arcs-types/modality.js';
import {ParticleExecutionHost} from './particle-execution-host.js';
import {ParticleSpec} from './arcs-types/particle-spec.js';
import {Recipe, Handle, Particle, Slot, IsValidOptions, effectiveTypeForHandle, newRecipe} from './recipe/lib-recipe.js';
import {SlotComposer} from './slot-composer.js';
import {CollectionType, EntityType, InterfaceInfo, InterfaceType,
        TupleType, ReferenceType, SingletonType, Type, TypeVariable} from '../types/lib-types.js';
import {PecFactory} from './particle-execution-context.js';
import {VolatileMemory, VolatileStorageDriverProvider, VolatileStorageKey} from './storage/drivers/volatile.js';
import {DriverFactory} from './storage/drivers/driver-factory.js';
import {Exists} from './storage/drivers/driver.js';
import {StorageKey} from './storage/storage-key.js';
import {ArcSerializer, ArcInterface} from './arc-serializer.js';
import {ReferenceModeStorageKey} from './storage/reference-mode-storage-key.js';
import {SystemTrace} from '../tracelib/systrace.js';
import {StorageKeyParser} from './storage/storage-key-parser.js';
import {SingletonInterfaceHandle, handleForStoreInfo, TypeToCRDTTypeRecord} from './storage/storage.js';
import {StoreInfo} from './storage/store-info.js';
import {ActiveStore} from './storage/active-store.js';
import {StorageService} from './storage/storage-service.js';
import {ArcInfo} from './arc-info.js';

export type ArcOptions = Readonly<{
  arcInfo: ArcInfo,
  storageService: StorageService;
  pecFactories?: PecFactory[];
  slotComposer?: SlotComposer;
  loader: Loader;
  storageKey?: StorageKey;
  speculative?: boolean;
  innerArc?: boolean;
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
  public readonly isSpeculative: boolean;
  public readonly isInnerArc: boolean;
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
  private readonly storeDescriptions = new Map<StoreInfo<Type>, string>();
  private waitForIdlePromise: Promise<void> | null;
  private readonly inspectorFactory?: ArcInspectorFactory;
  public readonly inspector?: ArcInspector;
  private readonly innerArcsByParticle: Map<Particle, Arc[]> = new Map();
  private readonly instantiateMutex = new Mutex();

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

  constructor({arcInfo, storageService, pecFactories, slotComposer, loader, storageKey, speculative, innerArc, stub, inspectorFactory, modality, driverFactory, storageKeyParser} : ArcOptions) {
    this.modality = modality;
    this.driverFactory = driverFactory;
    this.storageKeyParser = storageKeyParser;
    // TODO: pecFactories should not be optional. update all callers and fix here.
    this.pecFactories = pecFactories && pecFactories.length > 0 ? pecFactories.slice() : [FakePecFactory(loader).bind(null)];

    // TODO(sjmiles): currently some UiBrokers need to recover arc from composer in order to forward events
    if (slotComposer && !slotComposer['arc']) {
      slotComposer['arc'] = this;
    }

    this.arcInfo = arcInfo;
    this.isSpeculative = !!speculative; // undefined => false
    this.isInnerArc = !!innerArc; // undefined => false
    this.isStub = !!stub;
    this._loader = loader;
    this.inspectorFactory = inspectorFactory;
    this.inspector = inspectorFactory && inspectorFactory.create(this);
    this.storageKey = storageKey;
    const ports = this.pecFactories.map(f => f(this.generateID(), this.idGenerator, this.storageKeyParser));
    this.peh = new ParticleExecutionHost({slotComposer, arc: this, ports});
    this.volatileStorageDriverProvider = new VolatileStorageDriverProvider(this);
    this.driverFactory.register(this.volatileStorageDriverProvider);
    this.storageService = storageService;
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
    for (const innerArc of this.innerArcs) {
      innerArc.dispose();
    }
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

  findInnerArcs(particle: Particle): Arc[] {
    return this.innerArcsByParticle.get(particle) || [];
  }

  // Inner arcs of this arc's transformation particles.
  // Does *not* include inner arcs of this arc's inner arcs.
  get innerArcs(): Arc[] {
    return ([] as Arc[]).concat( ...this.innerArcsByParticle.values());
  }

  // This arc and all its descendants.
  // *Does* include inner arcs of this arc's inner arcs.
  get allDescendingArcs(): Arc[] {
    return [this as Arc].concat(...this.innerArcs.map(arc => arc.allDescendingArcs));
  }

  createInnerArc(transformationParticle: Particle): Arc {
    const id = this.generateID('inner');
    const innerArc = new Arc({
      arcInfo: new ArcInfo({id, context: this.context, capabilitiesResolver: this.capabilitiesResolver}),
      storageService: this.storageService,
      pecFactories: this.pecFactories,
      slotComposer: this.peh.slotComposer,
      loader: this._loader,
      innerArc: true,
      speculative: this.isSpeculative,
      inspectorFactory: this.inspectorFactory,
      driverFactory: this.driverFactory,
      storageKeyParser: this.storageKeyParser
    });

    let particleInnerArcs = this.innerArcsByParticle.get(transformationParticle);
    if (!particleInnerArcs) {
      particleInnerArcs = [];
      this.innerArcsByParticle.set(transformationParticle, particleInnerArcs);
    }
    particleInnerArcs.push(innerArc);
    return innerArc;
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
  get allRecipes() { return [this.activeRecipe].concat(this.context.allRecipes); }
  get recipes() { return [this.activeRecipe]; }
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
    return Object.values(this.storeInfoById);
  }

  async getActiveStore<T extends Type>(storeInfo: StoreInfo<T>): Promise<ActiveStore<TypeToCRDTTypeRecord<T>>> {
    return this.storageService.getActiveStore(storeInfo);
  }

  // Makes a copy of the arc used for speculative execution.
  async cloneForSpeculativeExecution(): Promise<Arc> {
    const arc = new Arc({
      arcInfo: new ArcInfo({id: this.generateID(), context: this.context, capabilitiesResolver: this.capabilitiesResolver}),
      pecFactories: this.pecFactories,
      loader: this._loader,
      speculative: true,
      innerArc: this.isInnerArc,
      inspectorFactory: this.inspectorFactory,
      storageService: this.storageService,
      driverFactory: this.driverFactory,
      storageKeyParser: this.storageKeyParser
    });
    const storeMap: Map<StoreInfo<Type>, StoreInfo<Type>> = new Map();
    for (const storeInfo of this.stores) {
      // TODO(alicej): Should we be able to clone a StoreMux as well?
      const cloneInfo = new StoreInfo({
        storageKey: new VolatileStorageKey(this.id, storeInfo.id),
        exists: Exists.MayExist,
        type: storeInfo.type,
        id: storeInfo.id});
      await (await arc.getActiveStore(cloneInfo)).cloneFrom(await this.getActiveStore(storeInfo));

      storeMap.set(storeInfo, cloneInfo);
      if (this.storeDescriptions.has(storeInfo)) {
        arc.storeDescriptions.set(cloneInfo, this.storeDescriptions.get(storeInfo));
      }
    }

    this.loadedParticleInfo.forEach((info, id) => {
      const stores: Map<string, StoreInfo<Type>> = new Map();
      info.stores.forEach((store, name) => stores.set(name, storeMap.get(store)));
      arc.loadedParticleInfo.set(id, {spec: info.spec, stores});
    });

    const {cloneMap} = this.activeRecipe.mergeInto(arc.activeRecipe);

    this.recipeDeltas.forEach(recipe => arc.recipeDeltas.push({
      particles: recipe.particles.map(p => cloneMap.get(p)),
      handles: recipe.handles.map(h => cloneMap.get(h)),
      slots: recipe.slots.map(s => cloneMap.get(s)),
      patterns: recipe.patterns
    }));

    for (const [particle, innerArcs] of this.innerArcsByParticle.entries()) {
      arc.innerArcsByParticle.set(cloneMap.get(particle), await Promise.all(
          innerArcs.map(async arc => arc.cloneForSpeculativeExecution())));
    }

    for (const v of storeMap.values()) {
      // FIXME: Tags
      await arc.arcInfo.registerStore(v, []);
    }
    return arc;
  }

  /**
   * Instantiates the given recipe in the Arc.
   *
   * Executes the following steps:
   *
   * - Merges the recipe into the Active Recipe
   * - Populates missing slots.
   * - Processes the Handles and creates stores for them.
   * - Instantiates the new Particles
   * - Passes these particles for initialization in the PEC
   *
   * Waits for completion of an existing Instantiate before returning.
   */
  async instantiate(recipe: Recipe, reinstantiate: boolean = false): Promise<void> {
    assert(recipe.isResolved(), `Cannot instantiate an unresolved recipe: ${recipe.toString({showUnresolved: true})}`);
    assert(recipe.isCompatible(this.modality),
      `Cannot instantiate recipe ${recipe.toString()} with [${recipe.modality.names}] modalities in '${this.modality.names}' arc`);

    const release = await this.instantiateMutex.acquire();
    try {
      await this._doInstantiate(recipe, reinstantiate);
    } finally {
      release();
    }
  }

  async mergeIntoActiveRecipe(recipe: Recipe) {
    await this.arcInfo.instantiate(recipe);
    assert(this.arcInfo.recipeDeltas.length > 0);
    const {particles, handles, slots} = this.arcInfo.recipeDeltas[this.arcInfo.recipeDeltas.length - 1];
    for (const recipeHandle of handles) {
      const fate = recipeHandle.originalFate && recipeHandle.originalFate !== '?'
          ? recipeHandle.originalFate : recipeHandle.fate;
      const newStore = this.storeInfoById[recipeHandle.id];
      assert(newStore);

      if (!['copy', 'map', 'create'].includes(fate)) {
        continue;
      }

      if (fate === 'map') {
        await this.createActiveStore(newStore);
      } else {
        await this.createStoreInternal(newStore);
      }

      if (recipeHandle.immediateValue) {
        const particleSpec = recipeHandle.immediateValue;
        const type = recipeHandle.type;
        if (newStore.isSingletonInterfaceStore()) {
          assert(type instanceof InterfaceType && type.interfaceInfo.particleMatches(particleSpec));
          const handle: SingletonInterfaceHandle = await handleForStoreInfo(newStore, this, {ttl: recipeHandle.getTtl()}) as SingletonInterfaceHandle;
          await handle.set(particleSpec.clone());
        } else {
          throw new Error(`Can't currently store immediate values in non-singleton stores`);
        }
      } else if (fate === 'copy') {
        const copiedStoreRef = this.context.findStoreById(recipeHandle.originalId);
        const copiedActiveStore = await this.getActiveStore(copiedStoreRef);
        assert(copiedActiveStore, `Cannot find store ${recipeHandle.originalId}`);
        const activeStore = await this.getActiveStore(newStore);
        await activeStore.cloneFrom(copiedActiveStore);
        const copiedStoreDesc = this.getStoreDescription(copiedStoreRef);
        if (copiedStoreDesc) {
          this.storeDescriptions.set(newStore, copiedStoreDesc);
        }
      }
    }
    return {handles, particles, slots};
  }

  // Critical section for instantiate,
  private async _doInstantiate(recipe: Recipe, reinstantiate: boolean = false): Promise<void> {
    const {particles} = await this.mergeIntoActiveRecipe(recipe);
    await Promise.all(particles.map(recipeParticle => this._instantiateParticle(recipeParticle, reinstantiate)));
    if (this.inspector) {
      await this.inspector.recipeInstantiated(particles, this.activeRecipe.toString());
    }
  }

  // TODO(shanestephens): Once we stop auto-wrapping in singleton types below, convert this to return a well-typed store.
  async createStore<T extends Type>(type: T, name?: string, id?: string, tags?: string[], storageKey?: StorageKey,
        capabilities?: Capabilities): Promise<StoreInfo<T>> {
    const storeInfo = await this.arcInfo.createStoreInfo({type, name, id, storageKey, capabilities, tags});
    await this.createStoreInternal(storeInfo);
    return storeInfo;
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

  // Convert a type to a normalized key that we can use for
  // equality testing.
  //
  // TODO: we should be testing the schemas for compatiblity instead of using just the name.
  // TODO: now that this is only used to implement findStoresByType we can probably replace
  // the check there with a type system equality check or similar.
  static _typeToKey(type: Type): string | InterfaceInfo | null {
    if (type.isSingleton) {
      type = type.getContainedType();
    }
    const elementType = type.getContainedType();
    if (elementType) {
      const key = this._typeToKey(elementType);
      if (key) {
        return `list:${key}`;
      }
    } else if (type instanceof EntityType) {
      return type.entitySchema.name;
    } else if (type instanceof InterfaceType) {
      // TODO we need to fix this too, otherwise all handles of interface type will
      // be of the 'same type' when searching by type.
      return type.interfaceInfo;
    } else if (type instanceof TypeVariable && type.isResolved()) {
      return Arc._typeToKey(type.resolvedType());
    }
    return null;
  }

  findStoresByType<T extends Type>(type: T, options?: {tags: string[]}): StoreInfo<T>[] {
    const typeKey = Arc._typeToKey(type);
    let stores = Object.values(this.storeInfoById).filter(handle => {
      if (typeKey) {
        const handleKey = Arc._typeToKey(handle.type);
        if (typeKey === handleKey) {
          return true;
        }
      } else {
        if (type instanceof TypeVariable && !type.isResolved() && handle.type instanceof EntityType || handle.type instanceof SingletonType) {
          return true;
        }
        // elementType will only be non-null if type is either Collection or BigCollection; the tag
        // comparison ensures that handle.type is the same sort of collection.
        const elementType = type.getContainedType();
        if (elementType && elementType instanceof TypeVariable && !elementType.isResolved() && type.tag === handle.type.tag) {
          return true;
        }
      }
      return false;
    });

    if (options && options.tags && options.tags.length > 0) {
      stores = stores.filter(store => options.tags.filter(tag => !this.storeTagsById[store.id].has(tag)).length === 0);
    }

    // Quick check that a new handle can fulfill the type contract.
    // Rewrite of this method tracked by https://github.com/PolymerLabs/arcs/issues/1636.
    return stores.filter(s => {
      const isInterface = s.type.getContainedType() ? s.type.getContainedType() instanceof InterfaceType : s.type instanceof InterfaceType;
      return !!effectiveTypeForHandle(type, [{type: s.type, direction: isInterface ? 'hosts' : 'reads writes'}]);
    }) as StoreInfo<T>[];
  }

  findStoreById(id: string): StoreInfo<Type> {
    return this.storeInfoById[id];
  }

  findStoreTags(storeInfo: StoreInfo<Type>): Set<string> {
    return this.storeTagsById[storeInfo.id] || this.context.findStoreTags(storeInfo);
  }

  getStoreDescription(storeInfo: StoreInfo<Type>): string {
    assert(storeInfo, 'Cannot fetch description for nonexistent store');
    return this.storeDescriptions.get(storeInfo) || storeInfo.description;
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

  keyForId(id: string): StorageKey {
    return this.storeInfoById[id].storageKey;
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
