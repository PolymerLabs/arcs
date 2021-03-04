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
import {ArcId, IdGenerator} from './id.js';
import {Manifest} from './manifest.js';
import {Recipe, Particle} from './recipe/lib-recipe.js';
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
import {NewArcOptions, PlanPartition} from './arc-info.js';
import {ArcHost, ArcHostFactory, SingletonArcHostFactory} from './arc-host.js';
import {RecipeResolver} from './recipe-resolver.js';

export type PlanInArcOptions = Readonly<{
  arcId: ArcId;
  planName?: string;
}>;

export interface Allocator {
  arcHostFactories: ArcHostFactory[];
  registerArcHost(factory: ArcHostFactory);
  startArc(options: NewArcOptions): ArcId;
  // tslint:disable-next-line: no-any
  startArcWithPlan(options: NewArcOptions & {planName?: string}): Promise<ArcId>;
  // tslint:disable-next-line: no-any
  runPlanInArc(arcId: ArcId, plan: Recipe): Promise<any>; // TODO: remove this later!
  stopArc(arcId: ArcId);
  assignStorageKeys(arcId: ArcId, plan: Recipe, idGenerator?: IdGenerator): Promise<Recipe>;
  resolveRecipe(arcId: ArcId, recipe: Recipe): Promise<Recipe>;
}

export class AllocatorImpl implements Allocator {
  public readonly arcHostFactories: ArcHostFactory[] = [];
  public readonly planPartitionsByArcId = new Map<ArcId, PlanPartition[]>();
  public readonly idGeneratorByArcId = new Map<ArcId, IdGenerator>();
  public readonly hostById: Dictionary<ArcHost> = {};

  constructor(public readonly runtime: Runtime) {}

  registerArcHost(factory: ArcHostFactory) { this.arcHostFactories.push(factory); }

  startArc(options: NewArcOptions): ArcId {
    assert(options.arcId || options.arcName);
    let arcId = null;
    if (options.arcId) {
      arcId = options.arcId;
    } else {
      const idGenerator = IdGenerator.newSession();
      arcId = idGenerator.newArcId(options.arcName);
      this.idGeneratorByArcId.set(arcId, idGenerator);
    }
    assert(arcId);
    if (!this.planPartitionsByArcId.has(arcId)) {
      this.planPartitionsByArcId.set(arcId, []);
    }
    return arcId;
  }

  public async startArcWithPlan(options: NewArcOptions & {planName?: string}): Promise<ArcId> {
    const arcId = this.startArc(options);
    await this.runInArc(arcId, options.planName);
    return arcId;
  }

  // tslint:disable-next-line: no-any
  protected async runInArc(arcId: ArcId, planName?: string): Promise<any> {
    assert(this.planPartitionsByArcId.has(arcId));
    assert(planName || this.runtime.context.recipes.length === 1);
    const plan = planName
      ? this.runtime.context.allRecipes.find(r => r.name === planName)
      : this.runtime.context.recipes[0];
    assert(plan);
    assert(plan.normalize());
    assert(plan.isResolved(), `Unresolved partition plan: ${plan.toString({showUnresolved: true})}`);
    return this.runPlanInArc(arcId, plan);
  }

  // tslint:disable-next-line: no-any
  async runPlanInArc(arcId: ArcId, plan: Recipe): Promise<any> {
    plan.normalize();
    assert(plan.isResolved(), `Unresolved plan: ${plan.toString({showUnresolved: true})}`);
    const partitionByFactory = new Map<ArcHostFactory, Particle[]>();
    for (const particle of plan.particles) {
      const hostFactory = [...this.arcHostFactories.values()].find(
          factory => factory.isHostForParticle(particle));
      assert(hostFactory);
      if (!partitionByFactory.has(hostFactory)) {
        partitionByFactory.set(hostFactory, []);
      }
      partitionByFactory.get(hostFactory).push(particle);
    }
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

      const partition = {
        arcHostId: host.hostId,
        arcOptions: {arcId, idGenerator: this.idGeneratorByArcId.get(arcId)},
        plan: partial
      };
      this.planPartitionsByArcId.get(arcId).push(partition);
      return host.start(partition);
    }));
  }

  async assignStorageKeys(arcId: ArcId, plan: Recipe, idGenerator?: IdGenerator): Promise<Recipe> {
    // Assign storage keys for all `create` & `copy` stores.
    for (const handle of plan.handles) {
      if (['copy', 'create'].includes(handle.fate)) {
      let type = handle.type;
        if (handle.fate === 'create') {
          assert(type.maybeEnsureResolved(), `Can't assign resolved type to ${type}`);
        }

        type = type.resolvedType();
        assert(type.isResolved(), `Can't create handle for unresolved type ${type}`);
        // TODO: should handle immediate values here? no!
        if (!handle.immediateValue) {
          handle.id = handle.fate === 'create' && !!handle.id
            ? handle.id
            : (idGenerator || this.idGeneratorByArcId.get(arcId)).newChildId(arcId, '').toString();
          handle.fate = 'use';
          handle.storageKey = await this.runtime.getCapabilitiesResolver(arcId)
            .createStorageKey(handle.capabilities || Capabilities.create(), type, handle.id);
        }
      }
    }
    return this.resolveRecipe(arcId, plan);
  }

  async resolveRecipe(arcId: ArcId, recipe: Recipe): Promise<Recipe> {
    assert(this.normalize(recipe));
    for (const handle of recipe.handles) {
      // Otherwise normalize un-resolves typevar handle types/
      assert(handle.type.maybeEnsureResolved());
    }
    assert(recipe.isResolved(), `Unresolved recipe: ${recipe.toString({showUnresolved: true})}`);
    return recipe;
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
    assert(this.planPartitionsByArcId.has(arcId));
    for (const partition of this.planPartitionsByArcId.get(arcId)) {
      const host = this.hostById[partition.arcHostId];
      assert(host);
      host.stop(arcId);
    }
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

  startArc(options: NewArcOptions): ArcId {
    const arcId = super.startArc(options);

    this.host.start({arcOptions: {...options, arcId, idGenerator: this.idGeneratorByArcId.get(arcId)}, arcHostId: this.host.hostId});
    return arcId;
  }

  async resolveRecipe(arcId: ArcId, recipe: Recipe): Promise<Recipe> {
    let plan = await super.resolveRecipe(arcId, recipe);
    if (plan.isResolved()) {
      return plan;
    }
    const resolver = new RecipeResolver(this.host.getArcById(arcId));
    plan = await resolver.resolve(recipe);
    assert(plan && plan.isResolved());
    return plan;
  }
}
