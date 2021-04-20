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
import {DescriptionFormatter, DescriptionValue, ParticleDescription} from './description-formatter.js';
import {Relevance} from './relevance.js';
import {EntityType, InterfaceType, SingletonType, CollectionType} from '../types/lib-types.js';
import {Recipe, Particle, Handle} from './recipe/lib-recipe.js';
import {Dictionary} from '../utils/lib-utils.js';
import {CollectionEntityType, SingletonInterfaceType, SingletonEntityType} from './storage/storage.js';
import {CRDTTypeRecord} from '../crdt/lib-crdt.js';
import {StoreInfo} from './storage/store-info.js';
import {Runtime} from './runtime.js';
import {ArcInfo} from './arc-info.js';

export class Description {
  private constructor(
    private readonly storeDescById: Dictionary<string> = {},
    // TODO(mmandlis): replace Particle[] with serializable json objects.
    private readonly arcRecipes: {patterns: string[], particles: Particle[]}[],
    private readonly particleDescriptions: ParticleDescription[] = []) {
  }

  static async createForPlan(arcInfo: ArcInfo, plan: Recipe, runtime: Runtime): Promise<Description> {
    const allParticles = plan.particles;
    const particleDescriptions = await Description.initDescriptionHandles(allParticles, arcInfo, runtime);
    const storeDescById: {[id: string]: string} = {};
    for (const {id} of plan.handles) {
      const store = arcInfo.findStoreById(id);
      if (store) {
        storeDescById[id] = arcInfo.getStoreDescription(store);
      }
    }
    // ... and pass to the private constructor.
    return new Description(storeDescById, [{patterns: plan.patterns, particles: plan.particles}], particleDescriptions);
  }

  /**
   * Create a new Description object for the given Arc with an
   * optional Relevance object.
   */
  static async create(arcInfo: ArcInfo, runtime: Runtime, relevance?: Relevance): Promise<Description> {
    // Execute async related code here
    const allParticles = ([] as Particle[]).concat(...arcInfo.allDescendingArcs.map(arcInfo => arcInfo.activeRecipe.particles));
    const particleDescriptions = await Description.initDescriptionHandles(allParticles, arcInfo, runtime, relevance);

    const storeDescById: {[id: string]: string} = {};
    for (const {id} of arcInfo.activeRecipe.handles) {
      const store = arcInfo.findStoreById(id);
      if (store) {
        storeDescById[id] = arcInfo.getStoreDescription(store);
      }
    }

    // ... and pass to the private constructor.
    return new Description(storeDescById, arcInfo.recipeDeltas, particleDescriptions);
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

  private static async initDescriptionHandles(allParticles: Particle[], arcInfo?: ArcInfo, runtime?: Runtime, relevance?: Relevance): Promise<ParticleDescription[]> {
    return Promise.all(
      allParticles.map(particle => Description._createParticleDescription(particle, arcInfo, runtime, relevance)));
  }

  private static async _createParticleDescription(particle: Particle, arcInfo?: ArcInfo, runtime?: Runtime, relevance?: Relevance): Promise<ParticleDescription> {
    let pDesc : ParticleDescription = {
      _particle: particle,
      _connections: {}
    };

    if (relevance) {
      pDesc._rank = relevance.calcParticleRelevance(particle);
    }

    const descByName = await Description._getPatternByNameFromDescriptionHandle(particle, arcInfo, runtime);
    pDesc = {...pDesc, ...descByName};
    pDesc.pattern = pDesc.pattern || particle.spec.pattern;

    for (const handleConn of Object.values(particle.connections)) {
      const specConn = particle.spec.handleConnectionMap.get(handleConn.name);
      const pattern = descByName[handleConn.name] || specConn.pattern;

      pDesc._connections[handleConn.name] = {
        pattern,
        _handleConn: handleConn,
        value: await Description._prepareStoreValue(handleConn.handle.id, arcInfo, runtime)
      };
    }
    return pDesc;
  }

  private static async _getPatternByNameFromDescriptionHandle(particle: Particle, arcInfo: ArcInfo, runtime: Runtime): Promise<Dictionary<string>> {
    const descriptionConn = particle.connections['descriptions'];
    if (descriptionConn && descriptionConn.handle && descriptionConn.handle.id) {
      const descStore = arcInfo.findStoreById(descriptionConn.handle.id) as StoreInfo<CollectionEntityType>;
      if (descStore) {
        const descHandle = await runtime.host.handleForStoreInfo(descStore, arcInfo);
        const descByName: Dictionary<string> = {};
        for (const d of await descHandle.toList()) {
          descByName[d.key] = d.value;
        }
        return descByName;
      }
    }
    return {};
  }

  private static async _prepareStoreValue(storeId: string, arcInfo: ArcInfo, runtime: Runtime): Promise<DescriptionValue|undefined> {
    if (!arcInfo) {
      return null;
    }
    const store = arcInfo.findStoreById(storeId);
    if (!store) {
      return undefined;
    }
    if (store.type instanceof SingletonType && store.type.getContainedType() instanceof EntityType) {
      const handle = await runtime.host.handleForStoreInfo(store as StoreInfo<SingletonEntityType>, arcInfo);
      const entityValue = await handle.fetch();
      if (entityValue) {
        const schema = store.type.getEntitySchema();
        const valueDescription = schema ? schema.description.value : undefined;
        return {entityValue, valueDescription};
      }
    } else if (store.type instanceof SingletonType && store.type.getContainedType() instanceof InterfaceType) {
      const handle = await runtime.host.handleForStoreInfo(store as StoreInfo<SingletonInterfaceType>, arcInfo);
      const interfaceValue = await handle.fetch();
      if (interfaceValue) {
        return {interfaceValue};
      }
    } else if (store.type instanceof CollectionType) {
      const handle = await runtime.host.handleForStoreInfo(store as StoreInfo<CollectionEntityType>, arcInfo);
      const values = await handle.toList();
      if (values && values.length > 0) {
        return {collectionValues: values};
      }
    }
    return undefined;
  }
}
