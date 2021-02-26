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

export type StorageKeyPrefixer = (arcId: ArcId) => StorageKey;

export type NewArcOptions = Readonly<{
  arcName?: string,
  arcId?: ArcId,
  storageKeyPrefix?: StorageKeyPrefixer
  pecFactories?: PecFactory[];
  speculative?: boolean;
  innerArc?: boolean;
  stub?: boolean;
  listenerClasses?: ArcInspectorFactory[];
  inspectorFactory?: ArcInspectorFactory;
  modality?: Modality;
  slotObserver?: AbstractSlotObserver;
  idGenerator?: IdGenerator;
}>;

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
  assignStorageKeys(arcId: ArcId, plan: Recipe, idGenerator?: IdGenerator): Promise<void>;
}

export type PlanPartition = Readonly<{
  plan?: Recipe; // TODO: plan should be mandatory, when Arc and RunningArc classes are split.
  arcOptions: NewArcOptions;
  arcHostId: string;
}>;

export interface ArcHostFactory {
  isHostForParticle(particle: Particle): boolean;
  createHost(): ArcHost;
}

export class SingletonArcHostFactory implements ArcHostFactory {
  constructor(public readonly host: ArcHost) {}

  isHostForParticle(particle: Particle): boolean {
    return this.host.isHostForParticle(particle);
  }
  createHost() { return this.host; }
}

export interface ArcHost {
  hostId: string;
  storageService: StorageService;
  // slotComposer: SlotComposer;  // TODO: refactor to UiBroker.

  start(plan: PlanPartition);
  stop(arcId: ArcId);
  getArcById(arcId: ArcId): Arc;
  isHostForParticle(particle: Particle): boolean;
  buildArcParams(options: NewArcOptions): ArcOptions;
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

      // assert(partial.normalize());
      // for (const handle of partial.handles) {
      //   // Otherwise normalize un-resolves typevar handle types/
      //   assert(handle.type.maybeEnsureResolved());
      // }
      // assert(partial.isResolved(), `UNRESOLVED: ${partial.toString({showUnresolved: true})}`);
      const partition = {
        arcHostId: host.hostId,
        arcOptions: {arcId, idGenerator: this.idGeneratorByArcId.get(arcId)},
        plan: partial
      };
      this.planPartitionsByArcId.get(arcId).push(partition);
      return host.start(partition);
    }));
  }

  async assignStorageKeys(arcId: ArcId, plan: Recipe, idGenerator?: IdGenerator): Promise<void> {
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

      // TODO: Should this be here, or inside `runPlanInArc`???
      assert(plan.normalize());
      for (const handle of plan.handles) {
        // Otherwise normalize un-resolves typevar handle types/
        assert(handle.type.maybeEnsureResolved());
      }
      assert(plan.isResolved(), `Unresolved plan: ${plan.toString({showUnresolved: true})}`);
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
}

export class ArcHostImpl implements ArcHost {
  public readonly arcById = new Map<ArcId, Arc>();
  constructor(public readonly hostId: string,
              public readonly runtime: Runtime) {}
  public get storageService() { return this.runtime.storageService; }

  async start(partition: PlanPartition) {
    const arcId = partition.arcOptions.arcId;
    if (!arcId || !this.arcById.has(arcId)) {
      const arc = new Arc(this.buildArcParams(partition.arcOptions));
      this.arcById.set(arcId, arc);
      if (partition.arcOptions.slotObserver) {
        arc.peh.slotComposer.observeSlots(partition.arcOptions.slotObserver);
      }
    }
    if (partition.plan) {
      assert(partition.plan.isResolved(), `Unresolved partition plan: ${partition.plan.toString({showUnresolved: true})}`);
      const arc = this.arcById.get(arcId);
      return arc.instantiate(partition.plan);
      // TODO: add await to instantiate and return arc.idle here!
      // TODO: move the call to ParticleExecutionHost's DefineHandle to here
    }
  }

  stop(arcId: ArcId) {
    assert(this.arcById.has(arcId));
    this.arcById.get(arcId).dispose();
  }

  getArcById(arcId: ArcId): Arc {
    assert(this.arcById.get(arcId));
    return this.arcById.get(arcId);
  }

  isHostForParticle(particle: Particle): boolean { return true; }

  buildArcParams(options: NewArcOptions): ArcOptions {
    const idGenerator = options.idGenerator || IdGenerator.newSession();
    const id = options.arcId || idGenerator.newArcId(options.arcName);
    const factories = Object.values(this.runtime.storageKeyFactories);
    return {
      id,
      loader: this.runtime.loader,
      context: this.runtime.context,
      pecFactories: [this.runtime.pecFactory],
      slotComposer: this.runtime.composerClass ? new this.runtime.composerClass() : null,
      storageService: this.runtime.storageService,
      capabilitiesResolver: this.runtime.getCapabilitiesResolver(id),
      driverFactory: this.runtime.driverFactory,
      storageKey: options.storageKeyPrefix ? options.storageKeyPrefix(id) : new VolatileStorageKey(id, ''),
      storageKeyParser: this.runtime.storageKeyParser,
      idGenerator,
      ...options
    };
  }
}
