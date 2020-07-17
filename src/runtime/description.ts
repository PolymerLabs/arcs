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
import {AbstractStore} from './storage/abstract-store.js';
import {DescriptionFormatter, DescriptionValue, ParticleDescription} from './description-formatter.js';
import {Particle} from './recipe/particle.js';
import {Relevance} from './relevance.js';
import {EntityType, InterfaceType, SingletonType, CollectionType} from './type.js';
import {Handle} from './recipe/handle.js';
import {Recipe} from './recipe/recipe.js';
import {Dictionary} from './hot.js';
import {handleForStore, CollectionEntityStore, SingletonEntityStore, SingletonInterfaceStore} from './storage/storage.js';

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
      const descStore = arc.findStoreById(descriptionConn.handle.id) as CollectionEntityStore;
      if (descStore) {
        const descHandle = await handleForStore(descStore, arc);
        const descByName: Dictionary<string> = {};
        for (const d of await descHandle.toList()) {
          descByName[d.key] = d.value;
        }
        return descByName;
      }
    }
    return {};
  }

  private static async _prepareStoreValue(store: AbstractStore): Promise<DescriptionValue|undefined> {
    if (!store) {
      return undefined;
    }
    if (store.type instanceof SingletonType && store.type.getContainedType() instanceof EntityType) {
      const handle = await handleForStore(store as SingletonEntityStore, {generateID: null, idGenerator: null});
      const entityValue = await handle.fetch();
      if (entityValue) {
        const schema = store.type.getEntitySchema();
        const valueDescription = schema ? schema.description.value : undefined;
        return {entityValue, valueDescription};
      }
    } else if (store.type instanceof SingletonType && store.type.getContainedType() instanceof InterfaceType) {
      const handle = await handleForStore(store as SingletonInterfaceStore, {generateID: null, idGenerator: null});
      const interfaceValue = await handle.fetch();
      if (interfaceValue) {
        return {interfaceValue};
      }
    } else if (store.type instanceof CollectionType) {
      const handle = await handleForStore(store as CollectionEntityStore, {generateID: null, idGenerator: null});
      const values = await handle.toList();
      if (values && values.length > 0) {
        return {collectionValues: values};
      }
    }
    return undefined;
  }
}
