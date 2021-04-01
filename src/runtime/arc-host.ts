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
import {ArcId} from './id.js';
import {Particle} from './recipe/lib-recipe.js';
import {StorageService, HandleOptions} from './storage/storage-service.js';
import {SlotComposer} from './slot-composer.js';
import {Runtime} from './runtime.js';
import {VolatileStorageKey} from './storage/drivers/volatile.js';
import {PlanPartition, ArcInfo} from './arc-info.js';
import {Type} from '../types/lib-types.js';
import {StoreInfo} from './storage/store-info.js';
import {ToHandle, TypeToCRDTTypeRecord} from './storage/storage.js';
import {ReferenceModeStorageKey} from './storage/reference-mode-storage-key.js';
import {ActiveStore} from './storage/active-store.js';
import {ProvideSlotConnectionSpec} from './arcs-types/particle-spec.js';

export interface ArcHost {
  hostId: string;
  storageService: StorageService;
  // slotComposer: SlotComposer;  // TODO(b/182410550): refactor to UiBroker.

  start(plan: PlanPartition);
  stop(arcId: ArcId);
  getArcById(arcId: ArcId): Arc;
  isHostForParticle(particle: Particle): boolean;
  findArcByParticleId(particleId: string): Arc;
  slotContainers: {}[];

  handleForStoreInfo<T extends Type>(storeInfo: StoreInfo<T>, arcInfo: ArcInfo, options?: HandleOptions): Promise<ToHandle<TypeToCRDTTypeRecord<T>>>;
}

export class ArcHostImpl implements ArcHost {
  public readonly arcById = new Map<ArcId, Arc>();
  constructor(public readonly hostId: string,
              public readonly runtime: Runtime) {}
  public get storageService() { return this.runtime.storageService; }

  async start(partition: PlanPartition) {
    const arcId = partition.arcInfo.id;
    if (!arcId || !this.arcById.has(arcId)) {
      const arc = new Arc(this.buildArcParams(partition));
      this.arcById.set(arcId, arc);
      if (partition.arcOptions.slotObserver) {
        arc.peh.slotComposer.observeSlots(partition.arcOptions.slotObserver);
      }
    }
    const arc = this.arcById.get(arcId);
    if (partition.plan) {
      await arc.instantiate(partition.plan, partition.reinstantiate);
      // TODO(b/182410550): add await to instantiate and return arc.idle here!
      // TODO(b/182410550): move the call to ParticleExecutionHost's DefineHandle to here
    }
    if (partition.arcInfo.outerArcId) {
      const outerArc = this.arcById.get(partition.arcInfo.outerArcId);
      assert(outerArc);
      outerArc.addInnerArc(arc);
    }
    return arc;
  }

  stop(arcId: ArcId) {
    assert(this.arcById.has(arcId));
    this.arcById.get(arcId).dispose();
    delete this.arcById[arcId.toString()];
  }

  getArcById(arcId: ArcId): Arc {
    assert(this.arcById.get(arcId));
    return this.arcById.get(arcId);
  }

  isHostForParticle(particle: Particle): boolean { return true; }

  buildArcParams(partition: PlanPartition): ArcOptions {
    const factories = Object.values(this.runtime.storageKeyFactories);
    const {arcInfo, arcOptions} = partition;
    const slotComposer = arcInfo.isInnerArc
        ? this.getArcById(arcInfo.outerArcId).peh.slotComposer
        : new SlotComposer({containers: this.slotContainers});
    return {
      arcInfo,
      loader: this.runtime.loader,
      pecFactories: [this.runtime.pecFactory],
      allocator: this.runtime.allocator,
      host: this,
      slotComposer,
      storageService: this.runtime.storageService,
      driverFactory: this.runtime.driverFactory,
      storageKey: arcOptions.storageKeyPrefix ? arcOptions.storageKeyPrefix(arcInfo.id) : new VolatileStorageKey(arcInfo.id, ''),
      storageKeyParser: this.runtime.storageKeyParser,
      ...arcOptions
    };
  }

  get slotContainers(): {}[] {
    return [this.createContextForContainer('root')];
  }

  createContextForContainer(name) {
    return {
      id: `rootslotid-${name}`,
      name,
      tags: [`${name}`],
      spec: new ProvideSlotConnectionSpec({name}),
      handles: []
    };
  }

  findArcByParticleId(particleId: string): Arc {
    return [...this.arcById.values()].find(arc => arc.loadedParticleInfo.has(particleId));
  }

  async handleForStoreInfo<T extends Type>(storeInfo: StoreInfo<T>, arcInfo: ArcInfo, options?: HandleOptions): Promise<ToHandle<TypeToCRDTTypeRecord<T>>> {
    options = options || {};
    await this.getActiveStore(storeInfo, arcInfo);
    const generateID = arcInfo.generateID ? () => arcInfo.generateID().toString() : () => '';
    return this.storageService.handleForStoreInfo(storeInfo, generateID(), arcInfo.idGenerator, options);
  }

  private async getActiveStore<T extends Type>(storeInfo: StoreInfo<T>, arcInfo: ArcInfo) : Promise<ActiveStore<TypeToCRDTTypeRecord<T>>> {
    if (storeInfo.storageKey instanceof ReferenceModeStorageKey) {
      const containerInfo = arcInfo.findStoreInfoByStorageKey(storeInfo.storageKey.storageKey);
      if (containerInfo) {
        await this.storageService.getActiveStore(containerInfo);
      }
      const backingInfo = arcInfo.findStoreInfoByStorageKey(storeInfo.storageKey.backingKey);
      if (backingInfo) {
        await this.storageService.getActiveStore(backingInfo);
      }
    }
    return this.storageService.getActiveStore(storeInfo);
  }
}

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
