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
import {Recipe, Particle} from './recipe/lib-recipe.js';
import {Runtime} from './runtime.js';
import {Dictionary} from '../utils/lib-utils.js';
import {newRecipe} from './recipe/lib-recipe.js';
import {VolatileStorageKey} from './storage/drivers/volatile.js';
import {Modality} from './arcs-types/modality.js';
import {Capabilities} from './capabilities.js';
import {ArcInfo, StartArcOptions, DeserializeArcOptions, ArcInfoOptions, NewArcInfoOptions, RunArcOptions} from './arc-info.js';
import {ArcHost, ArcHostFactory, SingletonArcHostFactory} from './arc-host.js';

export interface Allocator {
  registerArcHost(factory: ArcHostFactory);

  startArc(options: StartArcOptions): Promise<ArcInfo>;
  // TODO(b/182410550): Callers should pass RunArcOptions to runPlanInArc,
  // if initially calling startArc with no planName.
  runPlanInArc(arcInfo: ArcInfo, plan: Recipe, arcOptions?: RunArcOptions, reinstantiate?: boolean): Promise<void[]>;

  deserialize(options: DeserializeArcOptions): Promise<ArcInfo>;

  stopArc(arcId: ArcId);

  // TODO(b/182410550): This method is only called externally when speculating.
  // It should become private, once Planning is incorporated into Allocator APIs.
  // Once private, consider not returning a value.
  assignStorageKeys(arcId: ArcId, plan: Recipe, idGenerator?: IdGenerator): Promise<Recipe>;
}

export class AllocatorImpl implements Allocator {
  protected readonly arcHostFactories: ArcHostFactory[] = [];
  protected readonly arcInfoById = new Map<ArcId, ArcInfo>();
  protected readonly hostById: Dictionary<ArcHost> = {};

  constructor(protected readonly runtime: Runtime) {}

  registerArcHost(factory: ArcHostFactory) {
    this.arcHostFactories.push(factory);
  }

  protected newArcInfo(options: NewArcInfoOptions & RunArcOptions): ArcInfo {
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
    if (!this.arcInfoById.has(arcId)) {
      assert(idGenerator, 'or maybe need to create one anyway?');
      this.arcInfoById.set(arcId, new ArcInfo(this.buildArcInfoOptions(arcId, idGenerator, options.outerArcId)));
    }
    return this.arcInfoById.get(arcId);
  }

  private buildArcInfoOptions(id: ArcId, idGenerator? : IdGenerator, outerArcId?: ArcId): ArcInfoOptions {
    return {
      id,
      context: this.runtime.context,
      capabilitiesResolver: this.runtime.getCapabilitiesResolver(id),
      idGenerator,
      outerArcId
    };
  }

  public async startArc(options: StartArcOptions): Promise<ArcInfo> {
    const arcInfo = this.newArcInfo(options);
    if (options.planName) {
      const plan = this.runtime.context.allRecipes.find(r => r.name === options.planName);
      assert(plan);
      await this.runPlanInArc(arcInfo, plan, options);
    }
    return arcInfo;
  }

  async runPlanInArc(arcInfo: ArcInfo, plan: Recipe, arcOptions?: RunArcOptions, reinstantiate?: boolean): Promise<void[]> {
    assert(plan.tryResolve(), `Cannot run an unresolved recipe: ${plan.toString({showUnresolved: true})}.`);

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

    plan = await this.assignStorageKeys(arcInfo.id, plan);
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
      assert(partial.tryResolve());

      const partition = {arcHostId: host.hostId, arcInfo, arcOptions, plan: partial, reinstantiate};
      arcInfo.partitions.push(partition);

      return host.start(partition);
    }));
  }

  async assignStorageKeys(arcId: ArcId, plan: Recipe, idGenerator?: IdGenerator): Promise<Recipe> {
    // TODO(b/182410550): All internal caller(s) should pass non normalized recipe.
    // Remove this check, once the method is private, and don't return recipe.
    if (plan.isNormalized()) {
      plan = plan.clone();
    }
    const arcInfo = this.arcInfoById.has(arcId)
        ? this.arcInfoById.get(arcId)
        : new ArcInfo(this.buildArcInfoOptions(arcId, idGenerator));
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
          ? handle.id : arcInfo.generateID().toString();
        handle.fate = 'use';
        handle.storageKey = await this.runtime.getCapabilitiesResolver(arcId)
          .createStorageKey(handle.capabilities || Capabilities.create(), type, handle.id);
      }
    }
    assert(plan.tryResolve());
    return plan;
  }

  public stopArc(arcId: ArcId) {
    const arcInfo = this.arcInfoById.get(arcId);
    assert(arcInfo);
    for (const innerArcInfo of arcInfo.innerArcs) {
      this.stopArc(innerArcInfo.id);
    }
    for (const partition of arcInfo.partitions) {
      const host = this.hostById[partition.arcHostId];
      assert(host);
      host.stop(arcId);
    }
    this.arcInfoById.delete(arcId);
  }

  async deserialize(options: DeserializeArcOptions): Promise<ArcInfo> {
    const {serialization, slotComposer, fileName, inspectorFactory} = options;
    const manifest = await this.runtime.parse(serialization, {fileName, context: this.runtime.context});
    const arcId = Id.fromString(manifest.meta.name);
    const storageKey = this.runtime.storageKeyParser.parse(manifest.meta.storageKey);

    assert(!this.arcInfoById.has(arcId));
    const idGenerator = IdGenerator.newSession();
    const arcInfo = new ArcInfo(this.buildArcInfoOptions(arcId, idGenerator));
    this.arcInfoById.set(arcId, arcInfo);
    await this.startArc({...options, arcId, idGenerator});

    await this.createStoresAndCopyTags(arcId, manifest);

    await this.runPlanInArc(arcInfo, manifest.activeRecipe, {}, /* reinstantiate= */ true);
    return arcInfo;
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

  protected newArcInfo(options: NewArcInfoOptions & RunArcOptions): ArcInfo {
    const arcInfo = super.newArcInfo(options);

    this.host.start({
      arcInfo,
      arcOptions: {...options},
      arcHostId: this.host.hostId
    });
    return arcInfo;
  }

  async createStoresAndCopyTags(arcId: ArcId, manifest: Manifest): Promise<void[]> {
    const arc = this.host.getArcById(arcId);

    return Promise.all(manifest.stores.map(async storeInfo => {
      const tags = [...manifest.storeTagsById[storeInfo.id]];
      if (storeInfo.storageKey instanceof VolatileStorageKey) {
        arc.volatileMemory.deserialize(storeInfo.model, storeInfo.storageKey.unique);
      }
      const arcInfo = arc.arcInfo;

      await arcInfo.registerStore(storeInfo, tags);
      arcInfo.addHandleToActiveRecipe(storeInfo);

      const newHandle = arcInfo.activeRecipe.handles.find(h => h.id === storeInfo.id);
      const handle = manifest.activeRecipe.handles.find(h => h.id === storeInfo.id);
      assert(newHandle);
      assert(handle);
      for (const tag of handle.tags) {
        if (newHandle.tags.includes(tag)) {
          continue;
        }
        newHandle.tags.push(tag);
      }
    }));
  }
}
