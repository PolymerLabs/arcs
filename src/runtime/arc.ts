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
import {Type, EntityType, TypeVariable, CollectionType, InterfaceType, RelationType, ArcType} from './type.js';
import {ParticleExecutionHost} from './particle-execution-host.js';
import {Handle} from './recipe/handle.js';
import {Recipe} from './recipe/recipe.js';
import {Manifest, StorageStub} from './manifest.js';
import {Description} from './description.js';
import {compareComparables} from './recipe/util.js';
import {FakePecFactory} from './fake-pec-factory.js';
import {StorageProviderFactory} from './storage/storage-provider-factory.js';
import {Id} from './id.js';
import {ArcDebugHandler} from './debug/arc-debug-handler.js';
import {Loader} from './loader.js';
import {StorageProviderBase} from './storage/storage-provider-base.js';
import {ParticleSpec} from './particle-spec.js';
import {PECInnerPort} from './api-channel.js';
import {Particle} from './recipe/particle.js';
import {SlotComposer} from './slot-composer.js';

type ArcOptions = {
  id: string;
  context: Manifest;
  pecFactory?: (id: string) => PECInnerPort;
  slotComposer?: SlotComposer;
  loader: Loader;
  storageKey?: string;
  storageProviderFactory?: StorageProviderFactory;
  speculative?: boolean;
};

export type PlanCallback = (recipe: Recipe) => void;

type SerializeContext = {handles: string, resources: string, interfaces: string, dataResources: Map<string, string>};

export class Arc {
  private readonly _context: Manifest;
  private readonly pecFactory: (id: string) => PECInnerPort;
  private readonly speculative: boolean;
  private _activeRecipe = new Recipe();
  // TODO: rename: these are just tuples of {particles, handles, slots, pattern} of instantiated recipes merged into active recipe.
  private _recipes = [];
  // Public for debug access
  public readonly _loader: Loader;
  private dataChangeCallbacks = new Map<object, () => void>();
  // All the stores, mapped by store ID
  private storesById = new Map<string, StorageProviderBase>();
  // storage keys for referenced handles
  private storageKeys: {[index: string]: string} = {};
  readonly storageKey: string;
  storageProviderFactory: StorageProviderFactory;
  // Map from each store to a set of tags. public for debug access
  public storeTags = new Map<StorageProviderBase, Set<string>>();
  // Map from each store to its description (originating in the manifest).
  private storeDescriptions = new Map<StorageProviderBase, Description>();
  private readonly _description: Description;
  private instantiatePlanCallbacks: PlanCallback[] = [];
  private waitForIdlePromise: Promise<void> | null;
  private debugHandler: ArcDebugHandler;

  readonly id: Id;
  particleHandleMaps = new Map<string, {spec: ParticleSpec, handles: Map<string, StorageProviderBase>}>();
  pec: ParticleExecutionHost;

  constructor({id, context, pecFactory, slotComposer, loader, storageKey, storageProviderFactory, speculative} : ArcOptions) {
    // TODO: context should not be optional.
    this._context = context || new Manifest({id});
    // TODO: pecFactory should not be optional. update all callers and fix here.
    this.pecFactory = pecFactory || FakePecFactory(loader).bind(null);

    // for now, every Arc gets its own session
    this.id = Id.newSessionId().fromString(id);
    this.speculative = !!speculative; // undefined => false
    this._loader = loader;

    this.storageKey = storageKey;

    const pecId = this.generateID();
    const innerPecPort = this.pecFactory(pecId);
    this.pec = new ParticleExecutionHost(innerPecPort, slotComposer, this);
    if (slotComposer) {
      slotComposer.arc = this;
    }
    this.storageProviderFactory = storageProviderFactory || new StorageProviderFactory(this.id);
    this._description = new Description(this);
    this.debugHandler = new ArcDebugHandler(this);
  }
  get loader(): Loader {
    return this._loader;
  }

  get description(): Description {
    return this._description;
  }

  get modality() { 
    return this.pec.slotComposer && this.pec.slotComposer.modality.name;
  }

  registerInstantiatePlanCallback(callback: PlanCallback) {
    this.instantiatePlanCallbacks.push(callback);
  }

  unregisterInstantiatePlanCallback(callback: PlanCallback) {
    const index = this.instantiatePlanCallbacks.indexOf(callback);
    if (index >= 0) {
      this.instantiatePlanCallbacks.splice(index, 1);
      return true;
    }
    return false;
  }

  dispose() {
    this.instantiatePlanCallbacks = [];
    // TODO: disconnect all assocated store event handlers
    this.pec.close();
    if (this.pec.slotComposer) {
      this.pec.slotComposer.dispose();
    }
  }

  // Returns a promise that spins sending a single `AwaitIdle` message until it
  // sees no other messages were sent.
  async _waitForIdle() {
    let messageCount;
    do {
      messageCount = this.pec.messageCount;
      await this.pec.idle;
      // We expect two messages here, one requesting the idle status, and one answering it.
    } while (this.pec.messageCount !== messageCount + 2);
  }

  get idle() {
    if (!this.waitForIdlePromise) {
      // Store one active completion promise for use by any subsequent callers.
      // We explicitly want to avoid, for example, multiple simultaneous
      // attempts to identify idle state each sending their own `AwaitIdle`
      // message and expecting settlement that will never arrive.
      this.waitForIdlePromise =
          this._waitForIdle().then(() => this.waitForIdlePromise = null);
    }
    return this.waitForIdlePromise;
  }

  get isSpeculative(): boolean {
    return this.speculative;
  }

  async _serializeHandle(handle: StorageProviderBase, context: SerializeContext, id: string): Promise<void> {
    const type = handle.type.getContainedType() || handle.type;
    if (type instanceof InterfaceType) {
      context.interfaces += type.interfaceInfo.toString() + '\n';
    }
    const key = this.storageProviderFactory.parseStringAsKey(handle.storageKey);
    const tags = this.storeTags.get(handle) || [];
    const handleTags = [...tags].map(a => `#${a}`).join(' ');

    const actualHandle = this.activeRecipe.findHandle(handle.id);
    const originalId = actualHandle ? actualHandle.originalId : null;
    let combinedId = `'${handle.id}'`;
    if (originalId) {
      combinedId += `!!'${originalId}'`;
    }

    switch (key.protocol) {
      case 'firebase':
      case 'pouchdb':
        context.handles += `store ${id} of ${handle.type.toString()} ${combinedId} @${handle.version === null ? 0 : handle.version} ${handleTags} at '${handle.storageKey}'\n`;
        break;
      case 'volatile': {
        // TODO(sjmiles): emit empty data for stores marked `nosync`: shell will supply data
        const nosync = handleTags.includes('nosync');
        let serializedData = [];
        if (!nosync) {
          // TODO: include keys in serialized [big]collections?
          serializedData = (await handle.toLiteral()).model.map(({id, value, index}) => {
            if (value == null) {
              return null;
            }

            let result;
            if (value.rawData) {
              result = {$id: id};
              for (const field of Object.keys(value.rawData)) {
                result[field] = value.rawData[field];
              }
            } else {
              result = value;
            }
            if (index !== undefined) {
              result.$index = index;
            }
            return result;
          });
        }
        if (handle.referenceMode && serializedData.length > 0) {
          const storageKey = serializedData[0].storageKey;
          if (!context.dataResources.has(storageKey)) {
            const storeId = `${id}_Data`;
            context.dataResources.set(storageKey, storeId);
            // TODO: can't just reach into the store for the backing Store like this, should be an
            // accessor that loads-on-demand in the storage objects.
            await handle.ensureBackingStore();
            await this._serializeHandle(handle.backingStore, context, storeId);
          }
          const storeId = context.dataResources.get(storageKey);
          serializedData.forEach(a => {a.storageKey = storeId;});
        }

        context.resources += `resource ${id}Resource\n`;
        const indent = '  ';
        context.resources += indent + 'start\n';

        const data = JSON.stringify(serializedData);
        context.resources += data.split('\n').map(line => indent + line).join('\n');
        context.resources += '\n';
        context.handles += `store ${id} of ${handle.type.toString()} ${combinedId} @${handle.version || 0} ${handleTags} in ${id}Resource\n`;
        break;
      }
      default:
        throw new Error(`unknown storageKey protocol ${key.protocol}`);
    }
  }

  async _serializeHandles() {
    const context = {handles: '', resources: '', interfaces: '', dataResources: new Map()};

    let id = 0;
    const importSet = new Set();
    const handlesToSerialize = new Set();
    const contextSet = new Set(this.context.stores.map(store => store.id));
    for (const handle of this._activeRecipe.handles) {
      if (handle.fate === 'map') {
        importSet.add(this.context.findManifestUrlForHandleId(handle.id));
      } else {
        // Immediate value handles have values inlined in the recipe and are not serialized.
        if (handle.immediateValue) continue;

        handlesToSerialize.add(handle.id);
      }
    }
    for (const url of importSet.values()) {
      context.resources += `import '${url}'\n`;
    }

    for (const handle of this._stores) {
      if (!handlesToSerialize.has(handle.id) || contextSet.has(handle.id)) {
        continue;
      }

      await this._serializeHandle(handle, context, `Store${id++}`);
    }

    return context.resources + context.interfaces + context.handles;
  }

  _serializeParticles() {
    const particleSpecs = [];
    // Particles used directly.
    particleSpecs.push(...this._activeRecipe.particles.map(entry => entry.spec));
    // Particles referenced in an immediate mode.
    particleSpecs.push(...this._activeRecipe.handles
        .filter(h => h.immediateValue)
        .map(h => h.immediateValue));

    const results = [];
    particleSpecs.forEach(spec => {
      for (const connection of spec.connections) {
        if (connection.type instanceof InterfaceType) {
          results.push(connection.type.interfaceInfo.toString());
        }
      }
      results.push(spec.toString());
    });
    return results.join('\n');
  }

  _serializeStorageKey() {
    if (this.storageKey) {
      return `storageKey: '${this.storageKey}'\n`;
    }
    return '';
  }

  async serialize(): Promise<string> {
    await this.idle;
    return `
meta
  name: '${this.id}'
  ${this._serializeStorageKey()}

${await this._serializeHandles()}

${this._serializeParticles()}

@active
${this.activeRecipe.toString()}`;
  }

  // Writes `serialization` to the ArcInfo child key under the Arc's storageKey.
  // This does not directly use serialize() as callers may want to modify the
  // contents of the serialized arc before persisting.
  async persistSerialization(serialization: string) {
    const storage = this.storageProviderFactory;
    const key = storage.parseStringAsKey(this.storageKey).childKeyForArcInfo();
    const arcInfoType = new ArcType();
    const store = await storage.connectOrConstruct('store', arcInfoType, key.toString());
    store.referenceMode = false;
    // TODO: storage refactor: make sure set() is available here (or wrap store in a Handle-like adaptor).
    await store['set'](arcInfoType.newInstance(this.id, serialization));
  }

  static async deserialize({serialization, pecFactory, slotComposer, loader, fileName, context}): Promise<Arc> {
    const manifest = await Manifest.parse(serialization, {loader, fileName, context});
    const arc = new Arc({
      id: manifest.meta.name,
      storageKey: manifest.meta.storageKey,
      slotComposer,
      pecFactory,
      loader,
      storageProviderFactory: manifest.storageProviderFactory,
      context
    });
    await Promise.all(manifest.stores.map(async store => {
      const tags = manifest.storeTags.get(store);
      if (store instanceof StorageStub) {
        store = await store.inflate();
      }
      arc._registerStore(store, tags);
    }));
    const recipe = manifest.activeRecipe.clone();
    const options = {errors: new Map()};
    assert(recipe.normalize(options), `Couldn't normalize recipe ${recipe.toString()}:\n${[...options.errors.values()].join('\n')}`);
    await arc.instantiate(recipe);
    return arc;
  }

  get context() {
    return this._context;
  }

  get activeRecipe() { return this._activeRecipe; }
  get recipes() { return this._recipes; }

  loadedParticles() {
    return [...this.particleHandleMaps.values()].map(({spec}) => spec);
  }

  _instantiateParticle(recipeParticle : Particle) {
    recipeParticle.id = this.generateID('particle');
    const handleMap = {spec: recipeParticle.spec, handles: new Map()};
    this.particleHandleMaps.set(recipeParticle.id, handleMap);

    for (const [name, connection] of Object.entries(recipeParticle.connections)) {
      if (!connection.handle) {
        assert(connection.isOptional);
        continue;
      }
      const handle = this.findStoreById(connection.handle.id);
      assert(handle, `can't find handle of id ${connection.handle.id}`);
      this._connectParticleToHandle(recipeParticle, name, handle);
    }

    // At least all non-optional connections must be resolved
    assert(handleMap.handles.size >= handleMap.spec.connections.filter(c => !c.isOptional).length,
           `Not all mandatory connections are resolved for {$particle}`);
    this.pec.instantiate(recipeParticle, handleMap.spec, handleMap.handles);
  }

  generateID(component: string = '') {
    return this.id.createId(component).toString();
  }

  get _stores(): StorageProviderBase[] {
    return [...this.storesById.values()];
  }

  // Makes a copy of the arc used for speculative execution.
  async cloneForSpeculativeExecution() {
    const arc = new Arc({id: this.generateID().toString(), pecFactory: this.pecFactory, context: this.context, loader: this._loader, speculative: true});
    const storeMap = new Map();
    for (const store of this._stores) {
      const clone = await arc.storageProviderFactory.construct(store.id, store.type, 'volatile');
      await clone.cloneFrom(store);
      storeMap.set(store, clone);
      if (this.storeDescriptions.has(store)) {
        arc.storeDescriptions.set(clone, this.storeDescriptions.get(store));
      }
    }
    this.particleHandleMaps.forEach((value, key) => {
      arc.particleHandleMaps.set(key, {
        spec: value.spec,
        handles: new Map()
      });
      value.handles.forEach(handle => arc.particleHandleMaps.get(key).handles.set(handle.name, storeMap.get(handle)));
    });

   const {particles, handles, slots} = this._activeRecipe.mergeInto(arc._activeRecipe);
   let particleIndex = 0;
   let handleIndex = 0;
   let slotIndex = 0;

   this._recipes.forEach(recipe => {
     const arcRecipe = {particles: [], handles: [], slots: [], innerArcs: new Map(), patterns: recipe.patterns};
     recipe.particles.forEach(p => {
       arcRecipe.particles.push(particles[particleIndex++]);
       if (recipe.innerArcs.has(p)) {
         const thisInnerArc = recipe.innerArcs.get(p);
         const transformationParticle = arcRecipe.particles[arcRecipe.particles.length - 1];
         const innerArc = {activeRecipe: new Recipe(), recipes: []};
         const innerTuples = thisInnerArc.activeRecipe.mergeInto(innerArc.activeRecipe);
         thisInnerArc.recipes.forEach(thisInnerArcRecipe => {
           const innerArcRecipe = {particles: [], handles: [], slots: [], innerArcs: new Map()};
           let innerIndex = 0;
           thisInnerArcRecipe.particles.forEach(thisInnerArcRecipeParticle => {
             innerArcRecipe.particles.push(innerTuples.particles[innerIndex++]);
           });
           innerIndex = 0;
           thisInnerArcRecipe.handles.forEach(thisInnerArcRecipeParticle => {
             innerArcRecipe.handles.push(innerTuples.handles[innerIndex++]);
           });
           innerIndex = 0;
           thisInnerArcRecipe.slots.forEach(thisInnerArcRecipeParticle => {
             innerArcRecipe.slots.push(innerTuples.slots[innerIndex++]);
           });
           innerArc.recipes.push(innerArcRecipe);
         });
         arcRecipe.innerArcs.set(transformationParticle, innerArc);
       }
     });
     recipe.handles.forEach(p => {
       arcRecipe.handles.push(handles[handleIndex++]);
     });
     recipe.slots.forEach(p => {
       arcRecipe.slots.push(slots[slotIndex++]);
     });

     arc._recipes.push(arcRecipe);
   });

    for (const v of storeMap.values()) {
      // FIXME: Tags
      arc._registerStore(v, []);
    }
    return arc;
  }

  async instantiate(recipe: Recipe, innerArc = undefined) {
    assert(recipe.isResolved(), `Cannot instantiate an unresolved recipe: ${recipe.toString({showUnresolved: true})}`);
    assert(recipe.isCompatibleWithModality(this.modality),
      `Cannot instantiate recipe ${recipe.toString()} with [${recipe.getSupportedModalities()}] modalities in '${this.modality}' arc`);

    let currentArc = {activeRecipe: this._activeRecipe, recipes: this._recipes};
    if (innerArc) {
      const innerArcs = this._recipes.find(r => !!r.particles.find(p => p === innerArc.particle)).innerArcs;
      if (!innerArcs.has(innerArc.particle)) {
         innerArcs.set(innerArc.particle, {activeRecipe: new Recipe(), recipes: []});
      }
      currentArc = innerArcs.get(innerArc.particle);
    }
    const {handles, particles, slots} = recipe.mergeInto(currentArc.activeRecipe);
    currentArc.recipes.push({particles, handles, slots, innerArcs: new Map(), patterns: recipe.patterns});

    // TODO(mmandlis): Get rid of populating the missing local slot IDs here,
    // it should be done at planning stage.
    slots.forEach(slot => slot.id = slot.id || `slotid-${this.generateID()}`);

    for (const recipeHandle of handles) {
      if (['copy', 'create'].includes(recipeHandle.fate)) {
        let type = recipeHandle.type;
        if (recipeHandle.fate === 'create') {
          assert(type.maybeEnsureResolved(), `Can't assign resolved type to ${type}`);
        }

        type = type.resolvedType();
        assert(type.isResolved(), `Can't create handle for unresolved type ${type}`);

        const newStore = await this.createStore(type, /* name= */ null, this.generateID(),
            recipeHandle.tags, recipeHandle.immediateValue ? 'volatile' : null);
        if (recipeHandle.immediateValue) {
          const particleSpec = recipeHandle.immediateValue;
          const type = recipeHandle.type;
          
          assert(type instanceof InterfaceType && type.interfaceInfo.particleMatches(particleSpec));
          const particleClone = particleSpec.clone().toLiteral();
          particleClone.id = newStore.id;
          // TODO(shans): clean this up when we have interfaces for Variable, Collection, etc.
          // tslint:disable-next-line: no-any
          await (newStore as any).set(particleClone);
        } else if (recipeHandle.fate === 'copy') {
          const copiedStore = this.findStoreById(recipeHandle.id);
          assert(copiedStore, `Cannot find store ${recipeHandle.id}`);
          assert(copiedStore.version !== null, `Copied store ${recipeHandle.id} doesn't have version.`);
          await newStore.cloneFrom(copiedStore);
          this._tagStore(newStore, this.findStoreTags(copiedStore));
          const copiedStoreDesc = this.getStoreDescription(copiedStore);
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

      let storageKey = recipeHandle.storageKey;
      if (!storageKey) {
        storageKey = this.keyForId(recipeHandle.id);
      }
      assert(storageKey, `couldn't find storage key for handle '${recipeHandle}'`);
      const type = recipeHandle.type.resolvedType();
      assert(type.isResolved());
      const store = await this.storageProviderFactory.connect(recipeHandle.id, type, storageKey);
      assert(store, `store '${recipeHandle.id}' was not found`);
      this._registerStore(store, recipeHandle.tags);
    }

    particles.forEach(recipeParticle => this._instantiateParticle(recipeParticle));

    if (this.pec.slotComposer) {
      // TODO: pass slot-connections instead
      this.pec.slotComposer.initializeRecipe(particles);
    }

    if (!this.isSpeculative && !innerArc) {
      // Note: callbacks not triggered for inner-arc recipe instantiation or speculative arcs.
      this.instantiatePlanCallbacks.forEach(callback => callback(recipe));
    }

    this.debugHandler.recipeInstantiated({particles});
  }

  _connectParticleToHandle(particle, name, targetHandle) {
    assert(targetHandle, 'no target handle provided');
    const handleMap = this.particleHandleMaps.get(particle.id);
    assert(handleMap.spec.connectionMap.get(name) !== undefined, 'can\'t connect handle to a connection that doesn\'t exist');
    handleMap.handles.set(name, targetHandle);
  }

  async createStore(type: Type, name, id, tags?, storageKey = undefined) {
    assert(type instanceof Type, `can't createStore with type ${type} that isn't a Type`);

    if (type instanceof RelationType) {
      type = new CollectionType(type);
    }

    if (id == undefined) {
      id = this.generateID();
    }

    if (storageKey == undefined && this.storageKey) {
      storageKey =
          this.storageProviderFactory.parseStringAsKey(this.storageKey)
              .childKeyForHandle(id)
              .toString();
    }

    // TODO(sjmiles): use `volatile` for nosync stores
    const hasNosyncTag = tags => tags && ((Array.isArray(tags) && tags.includes('nosync')) || tags === 'nosync');
    if (storageKey == undefined || hasNosyncTag(tags)) {
      storageKey = 'volatile';
    }

    const store = await this.storageProviderFactory.construct(id, type, storageKey);
    assert(store, `failed to create store with id [${id}]`);
    store.name = name;

    this._registerStore(store, tags);
    return store;
  }

  _registerStore(store: StorageProviderBase, tags?) {
    assert(!this.storesById.has(store.id), `Store already registered '${store.id}'`);
    tags = tags || [];
    tags = Array.isArray(tags) ? tags : [tags];


    this.storesById.set(store.id, store);

    this.storeTags.set(store, new Set(tags));

    this.storageKeys[store.id] = store.storageKey;
    store.on('change', () => this._onDataChange(), this);
  }

  _tagStore(store: StorageProviderBase, tags) {
    assert(this.storesById.has(store.id) && this.storeTags.has(store), `Store not registered '${store.id}'`);
    const storeTags = this.storeTags.get(store);
    (tags || []).forEach(tag => storeTags.add(tag));
  }

  _onDataChange() {
    for (const callback of this.dataChangeCallbacks.values()) {
      callback();
    }
  }

  onDataChange(callback, registration) {
    this.dataChangeCallbacks.set(registration, callback);
  }

  clearDataChange(registration) {
    this.dataChangeCallbacks.delete(registration);
  }

  // Convert a type to a normalized key that we can use for
  // equality testing.
  //
  // TODO: we should be testing the schemas for compatiblity instead of using just the name.
  // TODO: now that this is only used to implement findStoresByType we can probably replace
  // the check there with a type system equality check or similar.
  static _typeToKey(type: Type) {
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
  }

  findStoresByType(type: Type, options?): StorageProviderBase[] {
    const typeKey = Arc._typeToKey(type);
    let stores = [...this.storesById.values()].filter(handle => {
      if (typeKey) {
        const handleKey = Arc._typeToKey(handle.type);
        if (typeKey === handleKey) {
          return true;
        }
      } else {
        if (type instanceof TypeVariable && !type.isResolved() && handle.type instanceof EntityType) {
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
    return stores.filter(s => !!Handle.effectiveType(
      type, [{type: s.type, direction: (s.type instanceof InterfaceType) ? 'host' : 'inout'}]));
  }

  findStoreById(id): StorageProviderBase {
    let store = this.storesById.get(id);
    if (store == null) {
      store = this._context.findStoreById(id);
    }
    return store;
  }

  findStoreTags(store: StorageProviderBase) {
    if (this.storeTags.has(store)) {
      return this.storeTags.get(store);
    }
    return this._context.findStoreTags(store);
  }

  getStoreDescription(store) {
    assert(store, 'Cannot fetch description for nonexistent store');
    return this.storeDescriptions.get(store) || store.description;
  }

  getVersionByStore({includeArc=true, includeContext=false}) {
    const versionById = {};
    if (includeArc) {
      this.storesById.forEach((handle, id) => versionById[id] = handle.version);
    }
    if (includeContext) {
      this._context.allStores.forEach(handle => versionById[handle.id] = handle.version);
    }
    return versionById;
  }

  keyForId(id: string): string {
    return this.storageKeys[id];
  }

  stop(): void {
    this.pec.stop();
  }

  toContextString(options): string {
    const results = [];
    const stores = [...this.storesById.values()].sort(compareComparables);
    stores.forEach(store => {
      results.push(store.toString([...this.storeTags.get(store)]));
    });

    // TODO: include stores entities
    // TODO: include (remote) slots?

    if (!this._activeRecipe.isEmpty()) {
      results.push(this._activeRecipe.toString());
    }

    return results.join('\n');
  }
}
