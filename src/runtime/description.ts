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
import {Arc} from './arc.js';
import {UnifiedStore} from './storageNG/unified-store.js';
import {DescriptionFormatter, DescriptionValue, ParticleDescription} from './description-formatter.js';
import {Particle} from './recipe/particle.js';
import {Relevance} from './relevance.js';
import {BigCollectionType, CollectionType, EntityType, InterfaceType, SingletonType} from './type.js';
import {CollectionStorageProvider, BigCollectionStorageProvider, SingletonStorageProvider} from './storage/storage-provider-base.js';
import {Handle} from './recipe/handle.js';
import {Recipe} from './recipe/recipe.js';
import {Dictionary} from './hot.js';
import {Flags} from './flags.js';
import {StorageProxy} from './storageNG/storage-proxy.js';
import {unifiedHandleFor} from './handle.js';
import {SingletonHandle, CollectionHandle, handleNGFor} from './storageNG/handle.js';

export class Description {
  private constructor(
    private readonly storeDescById: Dictionary<string> = {},
    // TODO(mmandlis): replace Particle[] with serializable json objects.
    private readonly arcRecipes: {patterns: string[], particles: Particle[]}[],
    private readonly particleDescriptions: ParticleDescription[] = []) {
  }

  static async XcreateForPlan(plan: Recipe): Promise<Description> {
    const particleDescriptions = await Description.initDescriptionHandles(plan.particles);
    return new Description({}, [{patterns: plan.patterns, particles: plan.particles}], particleDescriptions);
  }

  static async createForPlan(arc: Arc, plan: Recipe): Promise<Description> {
    const allParticles = plan.particles;
    const particleDescriptions = await Description.initDescriptionHandles(allParticles, arc);
    const storeDescById: {[id: string]: string} = {};
    for (const {id} of plan.handles) {
      const store = arc.findStoreById(id);
      if (store) {
        storeDescById[id] = arc.getStoreDescription(store);
      }
    }
    // ... and pass to the private constructor.
    return new Description(storeDescById, [{patterns: plan.patterns, particles: plan.particles}], particleDescriptions);
  }

  /**
   * Create a new Description object for the given Arc with an
   * optional Relevance object.
   */
  static async create(arc: Arc, relevance?: Relevance): Promise<Description> {
    // Execute async related code here
    const allParticles = ([] as Particle[]).concat(...arc.allDescendingArcs.map(arc => arc.activeRecipe.particles));
    const particleDescriptions = await Description.initDescriptionHandles(allParticles, arc, relevance);

    const storeDescById: {[id: string]: string} = {};
    for (const {id} of arc.activeRecipe.handles) {
      const store = arc.findStoreById(id);
      if (store) {
        storeDescById[id] = arc.getStoreDescription(store);
      }
    }

    // ... and pass to the private constructor.
    return new Description(storeDescById, arc.recipeDeltas, particleDescriptions);
  }

  getArcDescription(formatterClass = DescriptionFormatter): string|undefined {
    const patterns: string[] = ([] as string[]).concat(...this.arcRecipes.map(recipe => recipe.patterns));
    const particles: Particle[] = ([] as Particle[]).concat(...this.arcRecipes.map(recipe => recipe.particles));

    const desc = new (formatterClass)(this.particleDescriptions, this.storeDescById).getDescription({
      patterns,
      particles
    });

    if (desc) {
      return desc;
    }
    return undefined;
  }

  getRecipeSuggestion(formatterClass = DescriptionFormatter) {
    const formatter = new (formatterClass)(this.particleDescriptions, this.storeDescById);
    return formatter.getDescription(this.arcRecipes[this.arcRecipes.length - 1]);
  }

  getHandleDescription(recipeHandle: Handle): string {
    assert(recipeHandle.connections.length > 0, 'handle has no connections?');
    const formatter = new DescriptionFormatter(this.particleDescriptions, this.storeDescById);
    formatter.excludeValues = true;
    return formatter.getHandleDescription(recipeHandle);
  }

  public static getAllTokens(pattern: string): string[][] {
    const allTokens = [];
    const tokens = pattern.match(DescriptionFormatter.tokensRegex);
    for (let i = 0; i < tokens.length; ++i) {
      allTokens[i] = tokens[i].match(DescriptionFormatter.tokensInnerRegex)[1].split('.');
    }
    return allTokens;
  }

  private static async initDescriptionHandles(allParticles: Particle[], arc?: Arc, relevance?: Relevance): Promise<ParticleDescription[]> {
    return await Promise.all(
      allParticles.map(particle => Description._createParticleDescription(particle, arc, relevance)));
  }

  private static async _createParticleDescription(particle: Particle, arc?: Arc, relevance?: Relevance): Promise<ParticleDescription> {
    let pDesc : ParticleDescription = {
      _particle: particle,
      _connections: {}
    };

    if (relevance) {
      pDesc._rank = relevance.calcParticleRelevance(particle);
    }

    const descByName = await Description._getPatternByNameFromDescriptionHandle(particle, arc);
    pDesc = {...pDesc, ...descByName};
    pDesc.pattern = pDesc.pattern || particle.spec.pattern;

    for (const handleConn of Object.values(particle.connections)) {
      const specConn = particle.spec.handleConnectionMap.get(handleConn.name);
      const pattern = descByName[handleConn.name] || specConn.pattern;
      const store = arc ? arc.findStoreById(handleConn.handle.id) : null;

      pDesc._connections[handleConn.name] = {
        pattern,
        _handleConn: handleConn,
        value: await Description._prepareStoreValue(store)
      };
    }
    return pDesc;
  }

  private static async _getPatternByNameFromDescriptionHandle(particle: Particle, arc: Arc): Promise<Dictionary<string>> {
    const descriptionConn = particle.connections['descriptions'];
    if (descriptionConn && descriptionConn.handle && descriptionConn.handle.id) {
      if (Flags.useNewStorageStack) {
        const descStore = arc.findStoreById(descriptionConn.handle.id);
        if (descStore) {
          const descProxy = new StorageProxy('', await descStore.activate(), descStore.type, descStore.storageKey.toString());
          const descHandle = handleNGFor('', descProxy, null, null, true, false) as CollectionHandle<{key: string, value: string}>;

          const descByName: Dictionary<string> = {};
          for (const d of await descHandle.toList()) {
            descByName[d.key] = d.value;
          }
          return descByName;
        }
      } else {
        const descHandle = arc.findStoreById(descriptionConn.handle.id) as CollectionStorageProvider;

        if (descHandle) {
          // TODO(shans): fix this mess when there's a unified Collection class or interface.
          const descByName: Dictionary<string> = {};
          for (const d of await descHandle.toList()) {
            descByName[d.rawData.key] = d.rawData.value;
          }
          return descByName;
        }
      }
    }
    return {};
  }

  private static async _prepareStoreValue(store: UnifiedStore): Promise<DescriptionValue|undefined> {
    if (!store) {
      return undefined;
    }
    if (Flags.useNewStorageStack) {
      const proxy = new StorageProxy('id', await store.activate(), store.type, store.storageKey.toString());
      const handle = unifiedHandleFor({proxy, idGenerator: null, particleId: 'dummy'});
      if (handle instanceof SingletonHandle) {
        if (handle.type.getContainedType() instanceof EntityType) {
          const entityValue = await handle.fetch();
          if (entityValue) {
            const schema = store.type.getEntitySchema();
            const valueDescription = schema ? schema.description.value : undefined;
            return {entityValue, valueDescription};
          }
        } else if (handle.type.getContainedType() instanceof InterfaceType) {
          const interfaceValue = await handle.fetch();
          if (interfaceValue) {
            return {interfaceValue};
          }
        }
      } else if (handle instanceof CollectionHandle) {
        const values = await handle.toList();
        if (values && values.length > 0) {
          return {collectionValues: values};
        }
      }
      return undefined;
    }
    if (store.type instanceof CollectionType) {
      const collectionStore = store as CollectionStorageProvider;
      const values = await collectionStore.toList();
      if (values && values.length > 0) {
        return {collectionValues: values};
      }
    } else if (store.type instanceof BigCollectionType) {
      const bigCollectionStore = store as BigCollectionStorageProvider;
      const cursorId = await bigCollectionStore.stream(1);
      const {value, done} = await bigCollectionStore.cursorNext(cursorId);
      bigCollectionStore.cursorClose(cursorId);
      if (!done && value[0].rawData.name) {
        return {bigCollectionValues: value[0]};
      }
    } else if (store.type instanceof EntityType) {
      const singletonStore = store as SingletonStorageProvider;
      const value = await singletonStore.fetch();
      if (value && value['rawData']) {
        return {entityValue: value['rawData'], valueDescription: store.type.entitySchema.description.value};
      }
    } else if (store.type instanceof InterfaceType) {
      const singletonStore = store as SingletonStorageProvider;
      const interfaceValue = await singletonStore.fetch();
      if (interfaceValue) {
        return {interfaceValue};
      }
    }
    return undefined;
  }
}
