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
import {PlanPartition, NewArcOptions} from './arc-info.js';

export interface ArcHost {
  hostId: string;
  storageService: StorageService;
  // slotComposer: SlotComposer;  // TODO(b/182410550): refactor to UiBroker.

  start(plan: PlanPartition);
  stop(arcId: ArcId);
  getArcById(arcId: ArcId): Arc;
  isHostForParticle(particle: Particle): boolean;
  buildArcParams(options: NewArcOptions): ArcOptions;
  findArcByParticleId(particleId: string): Arc;
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
    const arc = this.arcById.get(arcId);
    if (partition.plan) {
      assert(partition.plan.isResolved(), `Unresolved partition plan: ${partition.plan.toString({showUnresolved: true})}`);
      await arc.instantiate(partition.plan, partition.reinstantiate);
      // TODO(b/182410550): add await to instantiate and return arc.idle here!
      // TODO(b/182410550): move the call to ParticleExecutionHost's DefineHandle to here
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

  buildArcParams(options: NewArcOptions): ArcOptions {
    const idGenerator = options.idGenerator || IdGenerator.newSession();
    const id = options.arcId || idGenerator.newArcId(options.arcName);
    const factories = Object.values(this.runtime.storageKeyFactories);
    return {
      id,
      loader: this.runtime.loader,
      context: this.runtime.context,
      pecFactories: [this.runtime.pecFactory],
      slotComposer: new SlotComposer(),
      storageService: this.runtime.storageService,
      capabilitiesResolver: this.runtime.getCapabilitiesResolver(id),
      driverFactory: this.runtime.driverFactory,
      storageKey: options.storageKeyPrefix ? options.storageKeyPrefix(id) : new VolatileStorageKey(id, ''),
      storageKeyParser: this.runtime.storageKeyParser,
      idGenerator,
      ...options
    };
  }

  findArcByParticleId(particleId: string): Arc {
    return [...this.arcById.values()].find(arc => !!arc.activeRecipe.findParticle(particleId));
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
