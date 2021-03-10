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
import {Recipe, Particle, IsValidOptions} from './recipe/lib-recipe.js';
import {StorageService} from './storage/storage-service.js';
import {SlotComposer} from './slot-composer.js';
import {Runtime} from './runtime.js';
import {Dictionary} from '../utils/lib-utils.js';
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
import {NewArcOptions, PlanPartition, DeserializeArcOptions} from './arc-info.js';
import {ArcHost, ArcHostFactory, SingletonArcHostFactory} from './arc-host.js';
import {RecipeResolver} from './recipe-resolver.js';

export type PlanInArcOptions = Readonly<{
  arcId: ArcId;
  planName?: string;
}>;

export interface Allocator {
  registerArcHost(factory: ArcHostFactory);

  // TODO(b/182410550): unify `newArc` and `startArc`.
  // Note: all `newArc` callers will have to support async execution.
  newArc(options: NewArcOptions): ArcId;
  startArc(options: NewArcOptions & {planName?: string}): Promise<ArcId>;
  runPlanInArc(arcId: ArcId, plan: Recipe, reinstantiate?: boolean): Promise<void[]>;

  deserialize(options: DeserializeArcOptions): Promise<ArcId>;

  stopArc(arcId: ArcId);

  // TODO(b/182410550): This method is only called externally when speculating.
  // It should become private, once Planning is incorporated into Allocator APIs.
  // Once private, consider not returning a value.
  assignStorageKeys(arcId: ArcId, plan: Recipe, idGenerator?: IdGenerator): Promise<Recipe>;
}

export class AllocatorImpl implements Allocator {
  protected readonly arcHostFactories: ArcHostFactory[] = [];
  protected readonly arcStateById = new Map<ArcId, {partitions: PlanPartition[], idGenerator: IdGenerator}>();
  protected readonly hostById: Dictionary<ArcHost> = {};

  constructor(protected readonly runtime: Runtime) {}

  registerArcHost(factory: ArcHostFactory) {
    this.arcHostFactories.push(factory);
  }

  newArc(options: NewArcOptions): ArcId {
    assert(options.arcId || options.arcName);
    let arcId = null;
    let idGenerator = null;
    if (options.arcId) {
      arcId = options.arcId;
    } else {
      idGenerator = IdGenerator.newSession();
      arcId = idGenerator.newArcId(options.arcName);
    }
    assert(arcId);
    idGenerator = idGenerator || IdGenerator.newSession();
    if (!this.arcStateById.has(arcId)) {
      assert(idGenerator, 'or maybe need to create one anyway?');
      this.arcStateById.set(arcId, {partitions: [], idGenerator});
    }
    return arcId;
  }

  public async startArc(options: NewArcOptions & {planName?: string}): Promise<ArcId> {
    const arcId = this.newArc(options);
    await this.runInArc(arcId, options.planName);
    return arcId;
  }

  protected async runInArc(arcId: ArcId, planName?: string): Promise<void[]> {
    assert(this.arcStateById.has(arcId));
    assert(planName || this.runtime.context.recipes.length === 1);
    const plan = planName
      ? this.runtime.context.allRecipes.find(r => r.name === planName)
      : this.runtime.context.recipes[0];
    assert(plan);
    return this.runPlanInArc(arcId, plan);
  }

  async runPlanInArc(arcId: ArcId, plan: Recipe, reinstantiate?: boolean): Promise<void[]> {
    plan = await this.resolveRecipe(arcId, plan);

    const partitionByFactory = new Map<ArcHostFactory, Particle[]>();
    // Partition the `plan` into particles by ArcHostFactory.
    for (const particle of plan.particles) {
      const hostFactory = [...this.arcHostFactories.values()].find(
          factory => factory.isHostForParticle(particle));
      assert(hostFactory);
      if (!partitionByFactory.has(hostFactory)) {
        partitionByFactory.set(hostFactory, []);
      }
      partitionByFactory.get(hostFactory).push(particle);
    }

    // Start all partitions.
    return Promise.all([...partitionByFactory.keys()].map(async factory => {
      const host = factory.createHost();
      this.hostById[host.hostId] = host;

      const partial = newRecipe();
      plan.mergeInto(partial);

      const partitionParticles = partitionByFactory.get(factory);
      plan.particles.forEach((particle, index) => {
        if (!partitionParticles.find(p => p.name === particle.name)) {
          plan.particles.splice(index, 1);
        }
      });
      await this.assignStorageKeys(arcId, partial);

      const arcOptions = {arcId, idGenerator: this.arcStateById.get(arcId).idGenerator};
      const partition = {arcHostId: host.hostId, arcOptions, plan: partial, reinstantiate};
      this.arcStateById.get(arcId).partitions.push(partition);

      return host.start(partition);
    }));
  }

  async assignStorageKeys(arcId: ArcId, plan: Recipe, idGenerator?: IdGenerator): Promise<Recipe> {
    // TODO(b/182410550): All internal caller(s) should pass non normalized recipe.
    // Remove this check, once the method is private, and don't return recipe.
    if (plan.isNormalized()) {
      plan = plan.clone();
    }
    // Assign storage keys for all `create` & `copy` stores.
    for (const handle of plan.handles) {
      if (handle.immediateValue) continue;
      if (['copy', 'create'].includes(handle.fate)) {
      let type = handle.type;
        if (handle.fate === 'create') {
          assert(type.maybeResolve(), `Can't assign resolved type to ${type}`);
        }

        type = type.resolvedType();
        assert(type.isResolved(), `Can't create handle for unresolved type ${type}`);
        handle.id = handle.fate === 'create' && !!handle.id
          ? handle.id
          : (idGenerator || this.arcStateById.get(arcId).idGenerator).newChildId(arcId, '').toString();
        handle.fate = 'use';
        handle.storageKey = await this.runtime.getCapabilitiesResolver(arcId)
          .createStorageKey(handle.capabilities || Capabilities.create(), type, handle.id);
      }
    }
    return this.resolveRecipe(arcId, plan);
  }

  // Returns the resolved recipe (the original recipe might have changed),
  // or throws an exception, if the recipe cannot be resolved.
  // Note this method is overriden by the subclass, and calls RecipeResolver, if needed.
  // The APIs might change, when Planning is incorporated in Allocator.
  protected async resolveRecipe(arcId: ArcId, recipe: Recipe): Promise<Recipe> {
    assert(this.tryResolveRecipe(arcId, recipe), `Unresolved recipe: ${recipe.toString({showUnresolved: true})}`);
    return recipe;
  }

  // Normalizes, if needed, and tries to resolve type variable handle types.
  // Returns true, if the recipe is resolved.
  protected tryResolveRecipe(arcId: ArcId, recipe: Recipe): boolean {
    assert(this.normalize(recipe));
    if (!recipe.isResolved()) {
      for (const handle of recipe.handles) {
        // The call to `normalize` above un-resolves typevar handle types.
        assert(handle.type.maybeResolve());
      }
    }
    return recipe.isResolved();
  }

  private normalize(recipe: Recipe): boolean {
    if (recipe.isNormalized()) {
      return true;
    }
    const errors = new Map();
    if (recipe.normalize({errors})) {
      return true;
    }
    console.warn('failed to normalize:\n', errors, recipe.toString());
    return false;
  }

  public stopArc(arcId: ArcId) {
    assert(this.arcStateById.get(arcId));
    for (const partition of this.arcStateById.get(arcId).partitions) {
      const host = this.hostById[partition.arcHostId];
      assert(host);
      host.stop(arcId);
    }
    this.arcStateById.delete(arcId);
  }

  async deserialize(options: DeserializeArcOptions): Promise<ArcId> {
    const {serialization, slotComposer, fileName, inspectorFactory} = options;
    const manifest = await this.runtime.parse(serialization, {fileName, context: this.runtime.context});
    const arcId = Id.fromString(manifest.meta.name);
    const storageKey = this.runtime.storageKeyParser.parse(manifest.meta.storageKey);

    assert(!this.arcStateById.has(arcId));
    const idGenerator = IdGenerator.newSession();
    this.arcStateById.set(arcId, {partitions: [], idGenerator});
    this.newArc({...options, arcId, idGenerator});

    await this.createStoresAndCopyTags(arcId, manifest);

    await this.runPlanInArc(arcId, manifest.activeRecipe, /* reinstantiate= */ true);
    return arcId;
  }

  protected async createStoresAndCopyTags(arcId: ArcId, manifest: Manifest): Promise<void[]> {
    // Temporarily this can only be implemented in SingletonAllocator subclass,
    // because it requires access to `host` and Arc's store creation API.
    return Promise.all([]);
  }
}

// Note: This is an interim solution. It is needed while stores are created directly on the Arc,
// hence callers need the ability to access the Arc object before any recipes were instantiated
// (and hence Arc object created in the Host).
export class SingletonAllocator extends AllocatorImpl {
  constructor(public readonly runtime: Runtime,
              public readonly host: ArcHost) {
    super(runtime);
    this.registerArcHost(new SingletonArcHostFactory(host));
  }

  newArc(options: NewArcOptions): ArcId {
    const arcId = super.newArc(options);

    this.host.start({
      arcOptions: {
        ...options,
        arcId,
        idGenerator: this.arcStateById.get(arcId).idGenerator
      },
      arcHostId: this.host.hostId
    });
    return arcId;
  }

  protected async resolveRecipe(arcId: ArcId, recipe: Recipe): Promise<Recipe> {
    super.tryResolveRecipe(arcId, recipe);
    if (recipe.isResolved()) {
      return recipe;
    }
    const resolver = new RecipeResolver(this.host.getArcById(arcId));
    const plan = await resolver.resolve(recipe);
    assert(plan && plan.isResolved(), `Unresolved plan: ${recipe.toString({showUnresolved: true})}`);
    return plan;
  }

  async createStoresAndCopyTags(arcId: ArcId, manifest: Manifest): Promise<void[]> {
    const arc = this.host.getArcById(arcId);

    return Promise.all(manifest.stores.map(async storeInfo => {
      const tags = [...manifest.storeTagsById[storeInfo.id]];
      if (storeInfo.storageKey instanceof VolatileStorageKey) {
        arc.volatileMemory.deserialize(storeInfo.model, storeInfo.storageKey.unique);
      }

      await arc.addStoreInfo(storeInfo, tags);

      const newHandle = arc.activeRecipe.handles.find(h => h.id === storeInfo.id);
      const handle = manifest.activeRecipe.handles.find(h => h.id === storeInfo.id);
      assert(newHandle && handle);
      for (const tag of handle.tags) {
        if (newHandle.tags.includes(tag)) {
          continue;
        }
        newHandle.tags.push(tag);
      }
    }));
  }
}
