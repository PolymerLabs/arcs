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
import {Runnable} from './hot.js';
import {Manifest} from './manifest.js';
import {MessagePort} from './message-channel.js';
import {Modality} from './modality.js';
import {ParticleExecutionHost} from './particle-execution-host.js';
import {ParticleSpec} from './particle-spec.js';
import {Handle} from './recipe/handle.js';
import {Particle} from './recipe/particle.js';
import {Recipe, IsValidOptions} from './recipe/recipe.js';
import {Slot} from './recipe/slot.js';
import {compareComparables} from './recipe/comparable.js';
import {SlotComposer} from './slot-composer.js';
import {CollectionType, EntityType, InterfaceInfo, InterfaceType,
        TupleType, ReferenceType, SingletonType, Type, TypeVariable} from './type.js';
import {PecFactory} from './particle-execution-context.js';
import {Mutex} from './mutex.js';
import {Dictionary} from './hot.js';
import {VolatileMemory, VolatileStorageDriverProvider, VolatileStorageKey} from './storageNG/drivers/volatile.js';
import {DriverFactory} from './storageNG/drivers/driver-factory.js';
import {Exists} from './storageNG/drivers/driver.js';
import {StorageKey} from './storageNG/storage-key.js';
import {Store} from './storageNG/store.js';
import {UnifiedStore, isSingletonInterfaceStore} from './storageNG/unified-store.js';
import {ArcSerializer, ArcInterface} from './arc-serializer.js';
import {ReferenceModeStorageKey} from './storageNG/reference-mode-storage-key.js';
import {SystemTrace} from '../tracelib/systrace.js';
import {StorageKeyParser} from './storageNG/storage-key-parser.js';
import {Ttl} from './recipe/ttl.js';
import {singletonHandle, SingletonInterfaceHandle, SingletonEntityStore} from './storageNG/storage-ng.js';

export type ArcOptions = Readonly<{
  id: Id;
  context: Manifest;
  pecFactories?: PecFactory[];
  slotComposer?: SlotComposer;
  loader: Loader;
  storageKey?: StorageKey;
  speculative?: boolean;
  innerArc?: boolean;
  stub?: boolean
  inspectorFactory?: ArcInspectorFactory,
  ports?: MessagePort[],
  capabilitiesResolver?: CapabilitiesResolver
}>;

type DeserializeArcOptions = Readonly<{
  serialization: string;
  pecFactories?: PecFactory[];
  slotComposer?: SlotComposer;
  loader: Loader;
  fileName: string;
  context: Manifest;
  inspectorFactory?: ArcInspectorFactory;
}>;

@SystemTrace
export class Arc implements ArcInterface {
  private readonly _context: Manifest;
  private readonly pecFactories: PecFactory[];
  public readonly isSpeculative: boolean;
  public readonly isInnerArc: boolean;
  public readonly isStub: boolean;
  private _activeRecipe = new Recipe();
  private _recipeDeltas: {handles: Handle[], particles: Particle[], slots: Slot[], patterns: string[]}[] = [];
  // Public for debug access
  public readonly _loader: Loader;
  private readonly dataChangeCallbacks = new Map<object, Runnable>();
  // All the stores, mapped by store ID
  private readonly storesById = new Map<string, UnifiedStore>();
  private readonly storesByKey = new Map<string | StorageKey, UnifiedStore>();
  // storage keys for referenced handles
  private storageKeys: Dictionary<StorageKey> = {};
  public readonly storageKey?:  StorageKey;
  private readonly capabilitiesResolver: CapabilitiesResolver;
  // Map from each store to a set of tags. public for debug access
  public readonly storeTags = new Map<UnifiedStore, Set<string>>();
  // Map from each store to its description (originating in the manifest).
  private readonly storeDescriptions = new Map<UnifiedStore, string>();
  private waitForIdlePromise: Promise<void> | null;
  private readonly inspectorFactory?: ArcInspectorFactory;
  public readonly inspector?: ArcInspector;
  private readonly innerArcsByParticle: Map<Particle, Arc[]> = new Map();
  private readonly instantiateMutex = new Mutex();

  readonly id: Id;
  readonly idGenerator: IdGenerator = IdGenerator.newSession();
  loadedParticleInfo = new Map<string, {spec: ParticleSpec, stores: Map<string, UnifiedStore>}>();
  readonly peh: ParticleExecutionHost;

  // Volatile storage local to this Arc instance.
  readonly volatileMemory = new VolatileMemory();
  private readonly volatileStorageDriverProvider: VolatileStorageDriverProvider;

  constructor({id, context, pecFactories, slotComposer, loader, storageKey, speculative, innerArc, stub, capabilitiesResolver, inspectorFactory} : ArcOptions) {
    this._context = context;
    // TODO: pecFactories should not be optional. update all callers and fix here.
    this.pecFactories = pecFactories && pecFactories.length > 0 ? pecFactories.slice() : [FakePecFactory(loader).bind(null)];

    // TODO(sjmiles): FIXME: currently some UiBrokers need to recover arc from composer in order to forward events
    if (slotComposer && !slotComposer['arc']) {
      slotComposer['arc'] = this;
    }

    this.id = id;
    this.isSpeculative = !!speculative; // undefined => false
    this.isInnerArc = !!innerArc; // undefined => false
    this.isStub = !!stub;
    this._loader = loader;
    this.inspectorFactory = inspectorFactory;
    this.inspector = inspectorFactory && inspectorFactory.create(this);
    this.storageKey = storageKey;
    const ports = this.pecFactories.map(f => f(this.generateID(), this.idGenerator));
    this.peh = new ParticleExecutionHost({slotComposer, arc: this, ports});
    this.volatileStorageDriverProvider = new VolatileStorageDriverProvider(this);
    DriverFactory.register(this.volatileStorageDriverProvider);
    this.capabilitiesResolver = capabilitiesResolver || new CapabilitiesResolver({arcId: this.id});
  }

  get loader(): Loader {
    return this._loader;
  }

  get modality(): Modality {
    if (this.peh.slotComposer && this.peh.slotComposer.modality) {
      return this.peh.slotComposer.modality;
    }
    if (!this.activeRecipe.isEmpty()) {
      return this.activeRecipe.modality;
    }
    return Modality.union(this.context.allRecipes.map(recipe => recipe.modality));
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

    DriverFactory.unregister(this.volatileStorageDriverProvider);
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
    const innerArc = new Arc({id, pecFactories: this.pecFactories, slotComposer: this.peh.slotComposer, loader: this._loader, context: this.context, innerArc: true, speculative: this.isSpeculative, inspectorFactory: this.inspectorFactory});

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

  static async deserialize({serialization, pecFactories, slotComposer, loader, fileName, context, inspectorFactory}: DeserializeArcOptions): Promise<Arc> {
    const manifest = await Manifest.parse(serialization, {loader, fileName, context});
    const id = Id.fromString(manifest.meta.name);
    const storageKey = StorageKeyParser.parse(manifest.meta.storageKey);
    const arc = new Arc({id, storageKey, slotComposer, pecFactories, loader, context, inspectorFactory});

    await Promise.all(manifest.stores.map(async storeStub => {
      const tags = manifest.storeTags.get(storeStub);
      if (storeStub.storageKey instanceof VolatileStorageKey) {
        arc.volatileMemory.deserialize(storeStub.storeInfo.model, storeStub.storageKey.unique);
      }
      const store = await storeStub.activate();
      await arc._registerStore(store.baseStore, tags);
      arc.addStoreToRecipe(store.baseStore);
    }));
    const recipe = manifest.activeRecipe.clone();
    const options: IsValidOptions = {errors: new Map()};
    assert(recipe.normalize(options), `Couldn't normalize recipe ${recipe.toString()}:\n${[...options.errors.values()].join('\n')}`);
    await arc.instantiate(recipe, true);

    // TODO(shanestephens): if we decide that merging a 'use' handle adds any tags on that handle to
    // the handle in the underlying recipe, then we can remove this from here.
    for (const handle of recipe.handles) {
      const newHandle = arc._activeRecipe.findHandleByID(handle.id);
      for (const tag of handle.tags) {
        if (newHandle.tags.includes(tag)) {
          continue;
        }
        newHandle.tags.push(tag);
      }
    }
    return arc;
  }

  get context() {
    return this._context;
  }

  get activeRecipe() { return this._activeRecipe; }
  get allRecipes() { return [this.activeRecipe].concat(this.context.allRecipes); }
  get recipes() { return [this.activeRecipe]; }
  get recipeDeltas() { return this._recipeDeltas; }

  loadedParticleSpecs() {
    return [...this.loadedParticleInfo.values()].map(({spec}) => spec);
  }

  async reinstantiateParticle(recipeParticle: Particle) {
    const info = await this._getParticleInstantiationInfo(recipeParticle);
    this.peh.reinstantiate(recipeParticle, info.stores);
  }

  async _instantiateParticle(recipeParticle: Particle, reinstantiate: boolean) {
    if (!recipeParticle.id) {
      recipeParticle.id = this.generateID('particle');
    }
    const info = await this._getParticleInstantiationInfo(recipeParticle);
    this.peh.instantiate(recipeParticle, info.stores, reinstantiate);
  }

  async _getParticleInstantiationInfo(recipeParticle: Particle): Promise<{spec: ParticleSpec, stores: Map<string, UnifiedStore>}> {
    const info = {spec: recipeParticle.spec, stores: new Map<string, UnifiedStore>()};
    this.loadedParticleInfo.set(recipeParticle.id.toString(), info);

    // if supported, provide particle caching via a BlobUrl representing spec.implFile
    if (!recipeParticle.isExternalParticle()) {
      await this._provisionSpecUrl(recipeParticle.spec);
    }

    for (const [name, connection] of Object.entries(recipeParticle.connections)) {
      if (connection.handle.fate !== '`slot') {
        const store = this.findStoreById(connection.handle.id);
        assert(store, `can't find store of id ${connection.handle.id}`);
        assert(info.spec.handleConnectionMap.get(name) !== undefined, 'can\'t connect handle to a connection that doesn\'t exist');
        info.stores.set(name, store as UnifiedStore);
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
    return this.idGenerator.newChildId(this.id, component);
  }

  get _stores(): UnifiedStore[] {
    return [...this.storesById.values()];
  }

  // Makes a copy of the arc used for speculative execution.
  async cloneForSpeculativeExecution(): Promise<Arc> {
    const arc = new Arc({id: this.generateID(),
                         pecFactories: this.pecFactories,
                         context: this.context,
                         loader: this._loader,
                         speculative: true,
                         innerArc: this.isInnerArc,
                         inspectorFactory: this.inspectorFactory});
    const storeMap: Map<UnifiedStore, UnifiedStore> = new Map();
    for (const store of this._stores) {
      const clone: UnifiedStore = new Store({
        storageKey: new VolatileStorageKey(this.id, store.id),
        exists: Exists.MayExist,
        type: store.type,
        id: store.id
      });
      await (await clone.activate()).cloneFrom(await store.activate());

      storeMap.set(store, clone);
      if (this.storeDescriptions.has(store)) {
        arc.storeDescriptions.set(clone, this.storeDescriptions.get(store));
      }
    }

    this.loadedParticleInfo.forEach((info, id) => {
      const stores: Map<string, UnifiedStore> = new Map();
      info.stores.forEach((store, name) => stores.set(name, storeMap.get(store)));
      arc.loadedParticleInfo.set(id, {spec: info.spec, stores});
    });

    const {cloneMap} = this._activeRecipe.mergeInto(arc._activeRecipe);

    this._recipeDeltas.forEach(recipe => arc._recipeDeltas.push({
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
      await arc._registerStore(v, []);
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
    const {handles, particles, slots} = recipe.mergeInto(this._activeRecipe);
    // handles represents only the new handles; it doesn't include 'use' handles that have
    // resolved against the existing recipe.
    this._recipeDeltas.push({particles, handles, slots, patterns: recipe.patterns});

    // TODO(mmandlis, jopra): Get rid of populating the missing local slot & slandle IDs here,
    // it should be done at planning stage.
    slots.forEach(slot => slot.id = slot.id || this.generateID('slot').toString());
    handles.forEach(handle => {
      if (handle.toSlot()) {
        handle.id = handle.id || this.generateID('slandle').toString();
      }
    });

    for (const recipeHandle of handles) {
      if (recipeHandle.fate === 'use') {
        throw new Error(`store '${recipeHandle.id}' with "use" fate was not found in recipe`);
      }

      const store = this.context.findStoreById(recipeHandle.id);
      if (['copy', 'create'].includes(recipeHandle.fate)) {
        let type = recipeHandle.type;
        if (recipeHandle.fate === 'create') {
          assert(type.maybeEnsureResolved(), `Can't assign resolved type to ${type}`);
        }

        type = type.resolvedType();
        assert(type.isResolved(), `Can't create handle for unresolved type ${type}`);

        const storeId = recipeHandle.fate === 'create' && !!recipeHandle.id ? recipeHandle.id : this.generateID().toString();
        const volatileKey = recipeHandle.immediateValue
          ? new VolatileStorageKey(this.id, '').childKeyForHandle(storeId)
          : undefined;

        const newStore = await this.createStoreInternal(
            type, /* name= */ null, storeId, recipeHandle.tags, volatileKey,
            recipeHandle.getCapabilitiesWithDefault(), recipeHandle.ttl);
        if (recipeHandle.immediateValue) {
          const particleSpec = recipeHandle.immediateValue;
          const type = recipeHandle.type;
          if (isSingletonInterfaceStore(newStore)) {
            assert(type instanceof InterfaceType && type.interfaceInfo.particleMatches(particleSpec));
            const handle: SingletonInterfaceHandle = singletonHandle(await newStore.activate(), this, {ttl: recipeHandle.ttl});
            await handle.set(particleSpec.clone());
          } else {
            throw new Error(`Can't currently store immediate values in non-singleton stores`);
          }
        } else if (['copy', 'map'].includes(recipeHandle.fate)) {
          const copiedStoreRef = this.context.findStoreById(recipeHandle.id);
          const copiedActiveStore = await copiedStoreRef.activate();
          assert(copiedActiveStore, `Cannot find store ${recipeHandle.id}`);
          const activeStore = await newStore.activate();
          await activeStore.cloneFrom(copiedActiveStore);
          this._tagStore(newStore, this.context.findStoreTags(copiedStoreRef));
          newStore.storeInfo.name = copiedStoreRef.name && `Copy of ${copiedStoreRef.name}`;
          const copiedStoreDesc = this.getStoreDescription(copiedStoreRef);
          if (copiedStoreDesc) {
            this.storeDescriptions.set(newStore, copiedStoreDesc);
          }
        }
        recipeHandle.id = newStore.id;
        recipeHandle.fate = 'use';
        recipeHandle.storageKey = newStore.storageKey;
        continue;
        // TODO: move the call to ParticleExecutionHost's DefineHandle to here
      }

      // TODO(shans/sjmiles): This shouldn't be possible, but at the moment the
      // shell pre-populates all arcs with a set of handles so if a recipe explicitly
      // asks for one of these there's a conflict. Ideally these will end up as a
      // part of the context and will be populated on-demand like everything else.
      if (this.storesById.has(recipeHandle.id)) {
        continue;
      }
      if (recipeHandle.fate !== '`slot') {
        let storageKey = recipeHandle.storageKey;
        if (!storageKey) {
          storageKey = this.keyForId(recipeHandle.id);
        }
        assert(storageKey, `couldn't find storage key for handle '${recipeHandle}'`);
        let type = recipeHandle.type.resolvedType();
        assert(type.isResolved());
        if (!type.isSingleton && !type.isCollectionType()) {
          type = new SingletonType(type);
        }
        const store = new Store({storageKey, exists: Exists.ShouldExist, type, id: recipeHandle.id});
        assert(store, `store '${recipeHandle.id}' was not found (${storageKey})`);
        await this._registerStore(store, recipeHandle.tags);
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

  private addStoreToRecipe(store: UnifiedStore) {
    const handle = this.activeRecipe.newHandle();
    handle.mapToStorage(store);
    handle.fate = 'use';
    // TODO(shans): is this the right thing to do?
    handle._type = handle.mappedType;
  }

  async createStore(type: Type, name?: string, id?: string, tags?: string[], storageKey?: StorageKey): Promise<UnifiedStore> {
    const store = await this.createStoreInternal(type, name, id, tags, storageKey);
    this.addStoreToRecipe(store);
    return store;
  }

  private async createStoreInternal(type: Type, name?: string, id?: string, tags?: string[], storageKey?: StorageKey, capabilities?: Capabilities, ttl?: Ttl): Promise<UnifiedStore> {
    assert(type instanceof Type, `can't createStore with type ${type} that isn't a Type`);
    if (this.storesByKey.has(storageKey)) {
      return this.storesByKey.get(storageKey);
    }

    if (type instanceof TupleType) {
      throw new Error('Tuple type is not yet supported');
    }

    if (id == undefined) {
      id = this.generateID().toString();
    }

    if (storageKey == undefined) {
      if (capabilities) {
        assert(!capabilities.isEmpty());
        storageKey = await this.capabilitiesResolver.createStorageKey(
            capabilities, type.getEntitySchema(), id);
      } else if (this.storageKey) {
        storageKey = this.storageKey.childKeyForHandle(id);
      }
    }

    // TODO(sjmiles): use `volatile` for volatile stores
    const hasVolatileTag = (tags: string[]) => tags && tags.includes('volatile');
    if (storageKey == undefined || hasVolatileTag(tags)) {
      storageKey = new VolatileStorageKey(this.id, id);
    }

    // Wrap entity types in a singleton.
    if (type.isEntity || type.isInterface || type.isReference) {
      // TODO: Once recipes can handle singleton types this conversion can be removed.
      type = new SingletonType(type);
    }
    const store = new Store({storageKey, exists: Exists.MayExist, type, id, name});

    await this._registerStore(store, tags);
    if (storageKey instanceof ReferenceModeStorageKey) {
      const refContainedType = new ReferenceType(type.getContainedType());
      const refType = type.isSingleton ? new SingletonType(refContainedType) : new CollectionType(refContainedType);
      await this.createStore(refType, name ? name + '_referenceContainer' : null, null, [], storageKey.storageKey);
      await this.createStore(new CollectionType(type.getContainedType()), name ? name + '_backingStore' : null, null, [], storageKey.backingKey);
    }
    return store;
  }

  async _registerStore(store: UnifiedStore, tags?: string[]): Promise<void> {
    assert(!this.storesById.has(store.id), `Store already registered '${store.id}'`);
    tags = tags || [];
    tags = Array.isArray(tags) ? tags : [tags];

    if (!(store.type.handleConstructor())) {
      throw new Error(`Type not supported by storage: '${store.type.tag}'`);
    }
    this.storesById.set(store.id, store);
    this.storesByKey.set(store.storageKey, store);

    this.storeTags.set(store, new Set(tags));

    this.storageKeys[store.id] = store.storageKey;

    const activeStore = await store.activate();
    activeStore.on(async () => this._onDataChange());

    this.context.registerStore(store, tags);
  }

  _tagStore(store: UnifiedStore, tags: Set<string>): void {
    assert(this.storesById.has(store.id) && this.storeTags.has(store), `Store not registered '${store.id}'`);
    const storeTags = this.storeTags.get(store);
    tags = tags || new Set();
    tags.forEach(tag => storeTags.add(tag));
  }

  _onDataChange(): boolean {
    for (const callback of this.dataChangeCallbacks.values()) {
      callback();
    }
    return true;
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

  findStoresByType(type: Type, options?: {tags: string[]}): UnifiedStore[] {
    const typeKey = Arc._typeToKey(type);
    let stores = [...this.storesById.values()].filter(handle => {
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
      stores = stores.filter(store => options.tags.filter(tag => !this.storeTags.get(store).has(tag)).length === 0);
    }

    // Quick check that a new handle can fulfill the type contract.
    // Rewrite of this method tracked by https://github.com/PolymerLabs/arcs/issues/1636.
    return stores.filter(s => {
      const storeType = s.type.isSingleton ? s.type.getContainedType() : s.type;
      return !!Handle.effectiveType(type, [{type: storeType, direction: (storeType instanceof InterfaceType) ? 'hosts' : 'reads writes'}]);
    });
  }

  findStoreById(id: string): UnifiedStore {
    const store = this.storesById.get(id);
    if (store == null) {
      return this._context.findStoreById(id);
    }
    return store;
  }

  findStoreTags(store: UnifiedStore): Set<string> {
    if (this.storeTags.has(store as UnifiedStore)) {
      return this.storeTags.get(store as UnifiedStore);
    }
    return this._context.findStoreTags(store);
  }

  getStoreDescription(store: UnifiedStore): string {
    assert(store, 'Cannot fetch description for nonexistent store');
    return this.storeDescriptions.get(store) || store.description;
  }

  getVersionByStore({includeArc=true, includeContext=false}) {
    const versionById = {};
    if (includeArc) {
      this.storesById.forEach((handle, id) => versionById[id] = handle.versionToken);
    }
    if (includeContext) {
      this._context.allStores.forEach(handle => versionById[handle.id] = handle.versionToken);
    }
    return versionById;
  }

  keyForId(id: string): StorageKey {
    return this.storageKeys[id];
  }

  toContextString(): string {
    const results: string[] = [];
    const stores = [...this.storesById.values()].sort(compareComparables);
    stores.forEach(store => {
      results.push(store.toManifestString({handleTags: [...this.storeTags.get(store)]}));
    });

    // TODO: include stores entities
    // TODO: include (remote) slots?

    if (!this._activeRecipe.isEmpty()) {
      results.push(this._activeRecipe.toString());
    }

    return results.join('\n');
  }

  get apiChannelMappingId() {
    return this.id.toString();
  }
}
