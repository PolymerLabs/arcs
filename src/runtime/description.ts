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
import {DescriptionFormatter, DescriptionValue, ParticleDescription} from './description-formatter.js';
import {Particle} from './recipe/particle.js';
import {Relevance} from './relevance.js';
import {BigCollectionType, CollectionType, EntityType, InterfaceType} from './type.js';
import {StorageProviderBase, CollectionStorageProvider, BigCollectionStorageProvider, VariableStorageProvider} from './storage/storage-provider-base.js';
import {StorageStub} from './manifest.js';
import {Handle} from './recipe/handle.js';

export class Description {
  private readonly storeDescById: {[id: string]: string} = {};
  private readonly arcRecipeName: string;
  // TODO(mmandlis): replace Particle[] with serializable json objects.
  private readonly arcRecipes: {patterns: string[], particles: Particle[]}[];

  private constructor(
      arc: Arc,
      private readonly particleDescriptions: ParticleDescription[] = []) {

    // Populate store descriptions by ID.
    for (const {id} of arc.activeRecipe.handles) {
      const store = arc.findStoreById(id);
      if (store && store instanceof StorageProviderBase) {
        this.storeDescById[id] = arc.getStoreDescription(store);
      }
    }

    // Retain specific details of the supplied Arc
    this.arcRecipeName = arc.activeRecipe.name;
    this.arcRecipes = arc.recipeDeltas;
  }

  /**
   * Create a new Description object for the given Arc with an
   * optional Relevance object.
   */
  static async create(arc: Arc, relevance?: Relevance): Promise<Description> {
    // Execute async related code here
    const particleDescriptions = await Description.initDescriptionHandles(arc, relevance);

    // ... and pass to the private constructor.
    return new Description(arc, particleDescriptions);
  }

  getArcDescription(formatterClass = DescriptionFormatter): string|undefined {
    const patterns: string[] = [].concat(...this.arcRecipes.map(recipe => recipe.patterns));
    const particles: Particle[] = [].concat(...this.arcRecipes.map(recipe => recipe.particles));

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
    const desc = formatter.getDescription(this.arcRecipes[this.arcRecipes.length - 1]);
    if (desc) {
      return desc;
    }
    return formatter._capitalizeAndPunctuate(this.arcRecipeName || Description.defaultDescription);
  }

  getHandleDescription(recipeHandle: Handle): string {
    assert(recipeHandle.connections.length > 0, 'handle has no connections?');
    const formatter = new DescriptionFormatter(this.particleDescriptions, this.storeDescById);
    formatter.excludeValues = true;
    return formatter.getHandleDescription(recipeHandle);
  }

  private static async initDescriptionHandles(arc: Arc, relevance?: Relevance): Promise<ParticleDescription[]> {
    const allParticles: Particle[] = [].concat(...arc.allDescendingArcs.map(arc => arc.activeRecipe.particles));

    return await Promise.all(
      allParticles.map(particle => Description._createParticleDescription(particle, arc, relevance)));
  }

  private static async _createParticleDescription(particle: Particle, arc: Arc, relevance?: Relevance): Promise<ParticleDescription> {
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
      const store = arc.findStoreById(handleConn.handle.id);

      pDesc._connections[handleConn.name] = {
        pattern,
        _handleConn: handleConn,
        value: await Description._prepareStoreValue(store)
      };
    }
    return pDesc;
  }

  private static async _getPatternByNameFromDescriptionHandle(particle: Particle, arc: Arc): Promise<{[key: string]: string}> {
    const descriptionConn = particle.connections['descriptions'];
    if (descriptionConn && descriptionConn.handle && descriptionConn.handle.id) {
      const descHandle = arc.findStoreById(descriptionConn.handle.id) as CollectionStorageProvider;

      if (descHandle) {
        // TODO(shans): fix this mess when there's a unified Collection class or interface.
        const descByName: {[key: string]: string} = {};
        for (const d of await descHandle.toList()) {
          descByName[d.rawData.key] = d.rawData.value;
        }
        return descByName;
      }
    }
    return {};
  }

  private static async _prepareStoreValue(store: StorageProviderBase | StorageStub): Promise<DescriptionValue>|undefined {
    if (!store) {
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
      const variableStore = store as VariableStorageProvider;
      const value = await variableStore.get();
      if (value && value['rawData']) {
        return {entityValue: value['rawData'], valueDescription: store.type.entitySchema.description.value};
      }
    } else if (store.type instanceof InterfaceType) {
      const variableStore = store as VariableStorageProvider;
      const interfaceValue = await variableStore.get();
      if (interfaceValue) {
        return {interfaceValue};
      }
    }
    return undefined;
  }

  /** A fallback description if none other can be found */
  static defaultDescription = `i'm feeling lucky`;
}
