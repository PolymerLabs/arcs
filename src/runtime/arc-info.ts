/**
 * @license
 * Copyright (c) 2021 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {assert} from '../platform/assert-web.js';
import {Arc} from './arc.js';
import {ArcId, IdGenerator, Id} from './id.js';
import {Manifest} from './manifest.js';
import {Recipe, Particle, Handle, Slot, effectiveTypeForHandle} from './recipe/lib-recipe.js';
import {SlotComposer} from './slot-composer.js';
import {Dictionary, Mutex} from '../utils/lib-utils.js';
import {newRecipe} from './recipe/lib-recipe.js';
import {CapabilitiesResolver} from './capabilities-resolver.js';
import {VolatileStorageKey} from './storage/drivers/volatile.js';
import {StorageKey} from './storage/storage-key.js';
import {PecFactory} from './particle-execution-context.js';
import {ArcInspectorFactory} from './arc-inspector.js';
import {AbstractSlotObserver} from './slot-observer.js';
import {Modality} from './arcs-types/modality.js';
import {Type, EntityType, ReferenceType, InterfaceType, SingletonType} from '../types/lib-types.js';
import {Capabilities} from './capabilities.js';
import {StoreInfo} from './storage/store-info.js';
import {Exists} from './storage/drivers/driver.js';
import {ReferenceModeStorageKey} from './storage/reference-mode-storage-key.js';
import {CollectionType, TupleType, TypeVariable, InterfaceInfo} from '../types/lib-types.js';

export type StorageKeyPrefixer = (arcId: ArcId) => StorageKey;

export type NewArcInfoOptions = Readonly<{
  arcName?: string;
  arcId?: ArcId;
  idGenerator?: IdGenerator;
  outerArcId?: ArcId;
  isSpeculative?: boolean;
}>;

export type RunArcOptions = Readonly<{
  storageKeyPrefix?: StorageKeyPrefixer;
  pecFactories?: PecFactory[];
  isSpeculative?: boolean;
  innerArc?: boolean;
  stub?: boolean;
  listenerClasses?: ArcInspectorFactory[];
  inspectorFactory?: ArcInspectorFactory;
  modality?: Modality;
  slotObserver?: AbstractSlotObserver;
}>;

export type StartArcOptions = NewArcInfoOptions & RunArcOptions & {planName?: string};

export type PlanPartition = Readonly<{
  // TODO(b/182410550): plan should be mandatory, when Arc class is refactored
  // into ArcState (like) structure, and there is no need to call ArcHost when
  // an Arc with no running recipes is created.
  plan?: {particles: Particle[], handles: Handle[]};
  reinstantiate?: boolean;
  arcInfo: ArcInfo;
  arcOptions: RunArcOptions;
  arcHostId: string;
}>;

export type DeserializeArcOptions = Readonly<{
  serialization: string;
  pecFactories?: PecFactory[];
  slotComposer?: SlotComposer;
  fileName: string;
  inspectorFactory?: ArcInspectorFactory;
}>;

export type ArcInfoOptions = Readonly<{
  id: ArcId;
  context: Manifest;
  capabilitiesResolver: CapabilitiesResolver;
  idGenerator?: IdGenerator;
  outerArcId?: ArcId;
  isSpeculative?: boolean;
}>;

export class ArcInfo {
  public readonly id: ArcId;
  public readonly context: Manifest;
  public readonly capabilitiesResolver: CapabilitiesResolver;
  public readonly idGenerator: IdGenerator;
  public readonly isSpeculative: boolean;
  get isInnerArc(): boolean { return this.outerArcId !== null; }
  public readonly outerArcId: ArcId|null;
  public readonly partitions: PlanPartition[] = [];
  readonly storeInfoById: Dictionary<StoreInfo<Type>> = {};
  public readonly storeTagsById: Dictionary<Set<string>> = {};
  readonly storeDescriptions = new Map<StoreInfo<Type>, string>();

  activeRecipe: Recipe = newRecipe();
  readonly recipeDeltas: {handles: Handle[], particles: Particle[], slots: Slot[], patterns: string[]}[] = [];
  private readonly instantiateMutex = new Mutex();

  readonly innerArcsByParticle: Map<Particle, ArcInfo[]> = new Map();

  constructor(opts: ArcInfoOptions) {
    this.id = opts.id;
    this.context = opts.context;
    this.capabilitiesResolver = opts.capabilitiesResolver;
    this.idGenerator = opts.idGenerator || IdGenerator.newSession();
    this.outerArcId = opts.outerArcId || null;
    this.isSpeculative = opts.isSpeculative || false;
  }

  generateID(component: string = ''): Id {
    return this.idGenerator.newChildId(this.id, component);
  }

  // TODO(shanestephens): Once we stop auto-wrapping in singleton types below, convert this to return a well-typed store.
  async createStoreInfo<T extends Type>(type: T, opts?: {name?: string, id?: string, storageKey?: StorageKey, capabilities?: Capabilities, exists?: Exists, tags?: string[]}): Promise<StoreInfo<T>> {
    opts = opts || {};
    let id = opts.id;
    if (id == undefined) {
      id = this.generateID().toString();
    }
    const storageKey = opts.storageKey ||
        // Consider passing `tags` to capabilities resolver.
        await this.capabilitiesResolver.createStorageKey(opts.capabilities || Capabilities.create(), type, id);

    const storeInfo = new StoreInfo({id, type, name: opts.name, storageKey, exists: opts.exists || Exists.MayExist});

    await this.registerStore(storeInfo, opts.tags, /* registerReferenceMode= */ true);
    this.addHandleToActiveRecipe(storeInfo);

    return storeInfo;
  }

  get stores(): StoreInfo<Type>[] {
    return Object.values(this.storeInfoById);
  }

  findStoreById(id: string): StoreInfo<Type> {
    return this.storeInfoById[id];
  }

  findStoreInfoByStorageKey(storageKey: StorageKey): StoreInfo<Type> {
    return Object.values(this.storeInfoById).find(
      storeInfo => storeInfo.storageKey.toString() === storageKey.toString());
  }

  findStoresByType<T extends Type>(type: T, options?: {tags: string[]}): StoreInfo<T>[] {
    const typeKey = ArcInfo._typeToKey(type);
    let stores = Object.values(this.storeInfoById).filter(handle => {
      if (typeKey) {
        const handleKey = ArcInfo._typeToKey(handle.type);
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
      return ArcInfo._typeToKey(type.resolvedType());
    }
    return null;
  }

  async registerStore(storeInfo: StoreInfo<Type>, tags?: string[], registerReferenceMode?: boolean): Promise<void> {
    assert(!this.storeInfoById[storeInfo.id], `Store already registered '${storeInfo.id}'`);
    const type = storeInfo.type;
    if (type instanceof TupleType) {
      throw new Error('Tuple type is not yet supported');
    }

    // Catch legacy cases that expected us to wrap entity types in a singleton.
    if (type.isEntity || type.isInterface || type.isReference) {
      throw new Error('unwrapped type provided to arc.createStore');
    }
    tags = tags || [];
    tags = Array.isArray(tags) ? tags : [tags];

    if (!(storeInfo.type.handleConstructor())) {
      throw new Error(`Type not supported by storage: '${storeInfo.type.tag}'`);
    }
    this.storeInfoById[storeInfo.id] = storeInfo;
    this.storeTagsById[storeInfo.id] = new Set(tags);

    this.context.registerStore(storeInfo, tags);

    if (registerReferenceMode) {
      const type = storeInfo.type;
      if (storeInfo.storageKey instanceof ReferenceModeStorageKey) {
        const refContainedType = new ReferenceType(type.getContainedType());
        const refType = type.isSingleton ? new SingletonType(refContainedType) : new CollectionType(refContainedType);

        await this.createStoreInfo(refType, {
          name: storeInfo.name ? storeInfo.name + '_referenceContainer' : null,
          storageKey: storeInfo.storageKey.storageKey
        });

        await this.createStoreInfo(new CollectionType(type.getContainedType()), {
          name: storeInfo.name ? storeInfo.name + '_backingStore' : null,
          storageKey: storeInfo.storageKey.backingKey
        });
      }
    }
  }

  tagStore(store: StoreInfo<Type>, tags: Set<string> = new Set()): void {
    assert(this.storeInfoById[store.id] && this.storeTagsById[store.id], `Store not registered '${store.id}'`);
    tags.forEach(tag => this.storeTagsById[store.id].add(tag));
  }

  addHandleToActiveRecipe(storeInfo: StoreInfo<Type>) {
    const handle = this.activeRecipe.newHandle();
    handle.mapToStorage(storeInfo);
    handle.fate = 'use';
    // TODO(shans): is this the right thing to do? This seems not to be the right thing to do!
    handle['_type'] = handle.mappedType;
  }

  async instantiate(recipe: Recipe): Promise<{particles: Particle[], handles: Handle[]}> {
    const release = await this.instantiateMutex.acquire();
    let result: {particles: Particle[], handles: Handle[]} = {particles: [], handles: []};
    try {
      result = await this.mergeIntoActiveRecipe(recipe);
    } finally {
      release();
    }
    return result;
  }

  async mergeIntoActiveRecipe(recipe: Recipe) {
    const {handles, particles, slots} = recipe.mergeInto(this.activeRecipe);
    // handles represents only the new handles; it doesn't include 'use' handles that have
    // resolved against the existing recipe.
    this.recipeDeltas.push({particles, handles, slots, patterns: recipe.patterns});

    // TODO(mmandlis, jopra): Get rid of populating the missing local slot & slandle IDs here,
    // it should be done at planning stage.
    slots.forEach(slot => slot.id = slot.id || this.generateID('slot').toString());
    handles.forEach(handle => {
      if (handle.toSlot()) {
        handle.id = handle.id || this.generateID('slandle').toString();
      }
    });

    for (const recipeHandle of handles) {
      assert(recipeHandle.immediateValue || ['use', 'map'].includes(recipeHandle.fate), `Unexpected fate: ${recipeHandle.fate}`);
      const fate = recipeHandle.originalFate && recipeHandle.originalFate !== '?'
          ? recipeHandle.originalFate : recipeHandle.fate;
      if (fate === 'use') {
        throw new Error(`store '${recipeHandle.id}' with "use" fate was not found in recipe`);
      }


      if (['copy', 'map', 'create'].includes(fate)) {
        let type = recipeHandle.type;
        if (recipeHandle.fate === 'create') {
          assert(type.maybeResolve(), `Can't assign resolved type to ${type}`);
        }

        type = type.resolvedType();
        assert(type.isResolved(), `Can't create handle for unresolved type ${type}`);

        assert(recipeHandle.id);
        const storageKey = recipeHandle.immediateValue
          ? new VolatileStorageKey(this.id, '').childKeyForHandle(recipeHandle.id)
          : recipeHandle.storageKey;
        assert(storageKey, `Missing storage for recipe handle ${recipeHandle.id}`);

        // TODO(shanestephens): Remove this once singleton types are expressed directly in recipes.
        if (type instanceof EntityType || type instanceof ReferenceType || type instanceof InterfaceType) {
          type = new SingletonType(type);
        }
        const exists = fate === 'map' ? Exists.ShouldExist : Exists.MayExist;
        const newStore = new StoreInfo({storageKey, type, exists, id: recipeHandle.id});
        await this.registerStore(newStore, recipeHandle.tags, /* registerReferenceMode= */ fate !== 'map');
        if (fate === 'copy' && !recipeHandle.immediateValue) {
          const copiedStoreInfo = this.context.findStoreById(recipeHandle.originalId);
          newStore.name = copiedStoreInfo.name && `Copy of ${copiedStoreInfo.name}`;
          this.tagStore(newStore, this.context.findStoreTags(copiedStoreInfo));

          const copiedStoreRef = this.context.findStoreById(recipeHandle.originalId);
          const copiedStoreDesc = this.getStoreDescription(copiedStoreRef);
          if (copiedStoreDesc) {
            this.storeDescriptions.set(newStore, copiedStoreDesc);
          }
        }
      }
    }
    return {handles, particles, slots};
  }

  getStoreDescription(storeInfo: StoreInfo<Type>): string {
    return this.storeDescriptions.get(storeInfo) || storeInfo.description;
  }

  findInnerArcs(particle: Particle): ArcInfo[] {
    return this.innerArcsByParticle.get(particle) || [];
  }

  get innerArcs(): ArcInfo[] {
    return ([] as ArcInfo[]).concat( ...this.innerArcsByParticle.values());
  }

  // This arc and all its descendants.
  // *Does* include inner arcs of this arc's inner arcs.
  get allDescendingArcs(): ArcInfo[] {
    return [this as ArcInfo].concat(...this.innerArcs.map(arc => arc.allDescendingArcs));
  }

  addInnerArc(particle: Particle, innerArcInfo: ArcInfo) {
    if (!this.innerArcsByParticle.has(particle)) {
      this.innerArcsByParticle.set(particle, []);
    }
    this.innerArcsByParticle.get(particle).push(innerArcInfo);
  }
}
