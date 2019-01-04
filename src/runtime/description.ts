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
import {CollectionType, BigCollectionType, EntityType, InterfaceType} from './type.js';

export class Description {
  private constructor(private readonly particleDescriptions = <ParticleDescription[]>[],
                      private readonly storeDescById: {[id: string]: string} = {},
                      private readonly arcRecipeName: string,
                      // TODO(mmandlis): replace Particle[] with serializable json objects.
                      private readonly arcRecipes: {patterns: string[], particles: Particle[]}[]) {}

  static async create(arc: Arc, relevance?: Relevance): Promise<Description> {
    const particleDescriptions = await Description.initDescriptionHandles(arc, relevance);
    return new Description(particleDescriptions, Description._getStoreDescById(arc), arc.activeRecipe.name, arc.recipes);
  }
 
  getArcDescription(formatterClass = DescriptionFormatter) : Promise<string> {
    const desc = new (formatterClass)(this.particleDescriptions, this.storeDescById).getDescription({
      patterns: [].concat.apply([], this.arcRecipes.map(recipe => recipe.patterns)),
      particles: [].concat.apply([], this.arcRecipes.map(recipe => recipe.particles))
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

  getHandleDescription(recipeHandle) {
    assert(recipeHandle.connections.length > 0, 'handle has no connections?');
    const formatter = new DescriptionFormatter(this.particleDescriptions, this.storeDescById);
    formatter.excludeValues = true;
    return formatter.getHandleDescription(recipeHandle);
  }

  static _getStoreDescById(arc: Arc): {} {
    const storeDescById = {};
    for (const {id} of arc.activeRecipe.handles) {
      const store = arc.findStoreById(id);
      if (store) {
        storeDescById[id] = arc.getStoreDescription(store);
      }
    }
    return storeDescById;
  }

  static async initDescriptionHandles(arc: Arc, relevance?: Relevance) {
    const particleDescriptions = [];
    const allParticles = [].concat(...arc.allDescendingArcs.map(arc => arc.activeRecipe.particles));
    await Promise.all(allParticles.map(async particle => {
      particleDescriptions.push(await this._createParticleDescription(particle, arc, relevance));
    }));
    return particleDescriptions;
  }

  static async _createParticleDescription(particle: Particle, arc: Arc, relevance?: Relevance) {
    let pDesc : ParticleDescription = {
      _particle: particle,
      _connections: {}
    };
    if (relevance) {
      pDesc._rank = relevance.calcParticleRelevance(particle);
    }

    const descByName = await this._getPatternByNameFromDescriptionHandle(particle, arc) || {};
    pDesc = {...pDesc, ...descByName};
    pDesc.pattern = pDesc.pattern || particle.spec.pattern;
    for (const handleConn of Object.values(particle.connections)) {
      const specConn = particle.spec.connectionMap.get(handleConn.name);
      const pattern = descByName[handleConn.name] || specConn.pattern;
      const store = arc.findStoreById(handleConn.handle.id);
      pDesc._connections[handleConn.name] = {
        pattern,
        _handleConn: handleConn,
        value: await this._prepareStoreValue(store)
      };
    }
    return pDesc;
  }

  static async _getPatternByNameFromDescriptionHandle(particle: Particle, arc: Arc) {
    const descriptionConn = particle.connections['descriptions'];
    if (descriptionConn && descriptionConn.handle && descriptionConn.handle.id) {
      const descHandle = arc.findStoreById(descriptionConn.handle.id);
      if (descHandle) {
        // TODO(shans): fix this mess when there's a unified Collection class or interface.
        const descList = await (<unknown>descHandle as {toList: () => Promise<{rawData: {key: string, value: string}}[]>}).toList();
        const descByName = {};
        descList.forEach(d => descByName[d.rawData.key] = d.rawData.value);
        return descByName;
      }
    }
    return undefined;
  }

  static async _prepareStoreValue(store): Promise<DescriptionValue> {
    if (!store) {
      return undefined;
    }
    if (store.type instanceof CollectionType) {
      const values = await store.toList();
      if (values && values.length > 0) {
        return {collectionValues: values};
      }
    } else if (store.type instanceof BigCollectionType) {
      const cursorId = await store.stream(1);
      const {value, done} = await store.cursorNext(cursorId);
      store.cursorClose(cursorId);
      if (!done && value[0].rawData.name) {
        return {bigCollectionValues: value[0]};
      }
    } else if (store.type instanceof EntityType) {
      const value = await store.get();
      if (value && value['rawData']) {
        return {entityValue: value['rawData'], valueDescription: store.type.entitySchema.description.value};
      }
    } else if (store.type instanceof InterfaceType) {
      const interfaceValue = await store.get();
      if (interfaceValue) {
        return {interfaceValue};
      }
    }
    return undefined;
  }

  static defaultDescription = 'i\'m feeling lucky';
}
