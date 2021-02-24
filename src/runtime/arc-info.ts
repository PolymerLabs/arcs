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
import {Arc, ArcOptions} from './arc.js';
import {ArcId, IdGenerator, Id} from './id.js';
import {Manifest} from './manifest.js';
import {Recipe, Particle} from './recipe/lib-recipe.js';
import {StorageService} from './storage/storage-service.js';
import {SlotComposer} from './slot-composer.js';
import {Runtime} from './runtime.js';
import {Dictionary, Mutex} from '../utils/lib-utils.js';
import {newRecipe} from './recipe/lib-recipe.js';
import {CapabilitiesResolver} from './capabilities-resolver.js';
import {VolatileStorageKey} from './storage/drivers/volatile.js';
import {StorageKey} from './storage/storage-key.js';
import {PecFactory} from './particle-execution-context.js';
import {ArcInspectorFactory} from './arc-inspector.js';
import {AbstractSlotObserver} from './slot-observer.js';
import {Modality} from './arcs-types/modality.js';
import {EntityType, ReferenceType, InterfaceType, SingletonType} from '../types/lib-types.js';
import {Capabilities} from './capabilities.js';
import {StoreInfo} from './storage/store-info.js';
import {Type} from '../types/lib-types.js';
import {Handle, Slot} from './recipe//lib-recipe.js';
import {Exists} from './storage/drivers/driver.js';
import {ReferenceModeStorageKey} from './storage/reference-mode-storage-key.js';
import {CollectionType, TupleType} from '../types/lib-types.js';

export type StorageKeyPrefixer = (arcId: ArcId) => StorageKey;

export type NewArcInfoOptions = Readonly<{
  arcName?: string;
  arcId?: ArcId;
  idGenerator?: IdGenerator;
}>;

export type RunArcOptions = Readonly<{
  storageKeyPrefix?: StorageKeyPrefixer;
  pecFactories?: PecFactory[];
  speculative?: boolean;
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
  plan?: Recipe;
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
}>;

export class ArcInfo {
  public readonly id: ArcId;
  public readonly context: Manifest;
  public readonly capabilitiesResolver: CapabilitiesResolver;
  public readonly idGenerator: IdGenerator;
  public readonly partitions: PlanPartition[] = [];
  readonly storeInfoById: Dictionary<StoreInfo<Type>> = {};
  public readonly storeTagsById: Dictionary<Set<string>> = {};
  activeRecipe: Recipe = newRecipe();
  readonly recipeDeltas: {handles: Handle[], particles: Particle[], slots: Slot[], patterns: string[]}[] = [];
  private readonly instantiateMutex = new Mutex();

  constructor(opts: ArcInfoOptions) {
    this.id = opts.id;
    this.context = opts.context;
    this.capabilitiesResolver = opts.capabilitiesResolver;
    this.idGenerator = opts.idGenerator || IdGenerator.newSession();
  }

  generateID(component: string = ''): Id {
    return this.idGenerator.newChildId(this.id, component);
  }

  async createStoreInfo<T extends Type>(opts: {type: T, name?: string, id?: string, storageKey?: StorageKey, capabilities?: Capabilities, exists?: Exists}): Promise<StoreInfo<T>> {
    let id = opts.id;
    if (id == undefined) {
      id = this.generateID().toString();
    }

    const storageKey = opts.storageKey ||
        // Consider passing `tags` to capabilities resolver.
        await this.capabilitiesResolver.createStorageKey(opts.capabilities || Capabilities.create(), opts.type, id);
    return new StoreInfo({id, type: opts.type, name: opts.name, storageKey, exists: opts.exists || Exists.MayExist});
  }

  findStoreInfoByStorageKey(storageKey: StorageKey): StoreInfo<Type> {
    return Object.values(this.storeInfoById).find(
      storeInfo => storeInfo.storageKey.toString() === storageKey.toString());
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

        const containerStoreInfo = await this.createStoreInfo({
          type: refType,
          name: storeInfo.name ? storeInfo.name + '_referenceContainer' : null,
          storageKey: storeInfo.storageKey.storageKey
        });
        await this.registerStore(containerStoreInfo);
        this.addHandleToActiveRecipe(containerStoreInfo);

        const backingStoreInfo = await this.createStoreInfo({
          type: new CollectionType(type.getContainedType()),
          name: storeInfo.name ? storeInfo.name + '_backingStore' : null,
          storageKey: storeInfo.storageKey.backingKey
        });
        await this.registerStore(backingStoreInfo);
        this.addHandleToActiveRecipe(backingStoreInfo);
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

  async instantiate(recipe: Recipe) {
    const release = await this.instantiateMutex.acquire();
    try {
      await this.mergeIntoActiveRecipe(recipe);
    } finally {
      release();
    }
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
        }
      }
    }
    return {handles, particles, slots};
  }
}
