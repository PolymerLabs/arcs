/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {Entity} from './entity.js';
import {BigCollection, Collection, Singleton} from './handle.js';
import {Particle} from './particle.js';
//import {SlotProxy} from './slot-proxy.js';
//import {Content} from './slot-consumer.js';

export interface UiParticleConfig {
  handleNames: string[];
  slotNames: string[];
}

export type RenderModel = object;

/**
 * Particle that can render and process events.
 */
export class UiSimpleParticle extends Particle {
  private currentSlotName: string | undefined;

  /**
   * Override if necessary, to modify superclass config.
   */
  get config(): UiParticleConfig {
    // TODO(sjmiles): getter that does work is a bad idea, this is temporary
    return {
      handleNames: this.spec.inputs.map(i => i.name),
      // TODO(mmandlis): this.spec needs to be replaced with a particle-spec loaded from
      // .arcs files, instead of .ptcl ones.
      slotNames: this.spec.slandleConnectionNames()
    };
  }

  /**
   * Override to return a template.
   */
  get template(): string {
    return '';
  }

  /**
   * Override to return a String defining primary markup for the given slot name.
   */
  // getTemplate(slotName: string): string {
  //   // TODO: only supports a single template for now. add multiple templates support.
  //   return this.template;
  // }

  /**
   * Override to return a String defining the name of the template for the given slot name.
   */
  // getTemplateName(slotName: string): string {
  //   // TODO: only supports a single template for now. add multiple templates support.
  //   return `default`;
  // }

  /**
   * Override to return false if the Particle isn't ready to `render()`
   */
  shouldRender(...args): boolean {
    return true;
  }

  renderOutput(...args): void {
    const renderModel = this.render(...args);
    if (renderModel) {
      this.renderModel(renderModel);
    }
  }

  // This is the default output 'packet', other implementations (modalities) could
  // output other things, or choose different output packets based on hints from 'model'
  renderModel(model) {
    this.output({
      template: this.template,
      model
    });
  }

  /**
   * Override to return a dictionary to map into the template.
   */
  render(stateArgs?): RenderModel {
    return {};
  }

  protected _getStateArgs() {
    return [];
  }

  // forceRenderTemplate(slotName: string = ''): void {
  //   this.slotProxiesByName.forEach((slot: SlotProxy, name: string) => {
  //     if (!slotName || (name === slotName)) {
  //       slot.requestedContentTypes.add('template');
  //     }
  //   });
  // }

  fireEvent(slotName: string, {handler, data}): void {
    if (this[handler]) {
      this[handler]({data});
    }
  }

  async setParticleDescription(pattern: string | {template, model: {}}): Promise<boolean | undefined> {
    if (typeof pattern === 'string') {
      return super.setParticleDescription(pattern);
    }
    if (pattern.template && pattern.model) {
      await super.setDescriptionPattern('_template_', pattern.template);
      await super.setDescriptionPattern('_model_', JSON.stringify(pattern.model));
      return undefined;
    } else {
      throw new Error('Description pattern must either be string or have template and model');
    }
  }

  /**
   * Remove all entities from named handle.
   */
  async clearHandle(handleName: string): Promise<void> {
    const handle = this.handles.get(handleName);
    if (handle instanceof Singleton || handle instanceof Collection) {
      await handle.clear();
    } else {
      throw new Error('Singleton/Collection required');
    }
  }

  /**
   * Merge entities from Array into named handle.
   */
  async mergeEntitiesToHandle(handleName: string, entities: Entity[]): Promise<void> {
    const idMap = {};
    const handle = this.handles.get(handleName);
    if (handle instanceof Collection) {
      const handleEntities = await handle.toList();
      handleEntities.forEach(entity => idMap[entity.id] = entity);
      for (const entity of entities) {
        if (!idMap[this.idFor(entity)]) {
          await handle.store(entity);
        }
      }
    } else {
      throw new Error('Collection required');
    }
  }

  /**
   * Append entities from Array to named handle.
   */
  async appendEntitiesToHandle(handleName: string, entities: Entity[]): Promise<void> {
    const handle = this.handles.get(handleName);
    if (handle) {
      if (handle instanceof Collection || handle instanceof BigCollection) {
        await Promise.all(entities.map(entity => handle.store(entity)));
      } else {
        throw new Error('Collection required');
      }
    }
  }

  /**
   * Create an entity from each rawData, and append to named handle.
   */
  async appendRawDataToHandle(handleName: string, rawDataArray): Promise<void> {
    const handle = this.handles.get(handleName);
    if (handle && handle.entityClass) {
      if (handle instanceof Collection || handle instanceof BigCollection) {
        const entityClass = handle.entityClass;
        await Promise.all(rawDataArray.map(raw => handle.store(new entityClass(raw))));
      } else {
        throw new Error('Collection required');
      }
    }
  }

  /**
   * Modify value of named handle. A new entity is created
   * from `rawData` (`new [EntityClass](rawData)`).
   */
  async updateSingleton(handleName: string, rawData) {
    const handle = this.handles.get(handleName);
    if (handle && handle.entityClass) {
      if (handle instanceof Singleton) {
        const entity = new handle.entityClass(rawData);
        await handle.set(entity);
        return entity;
      } else {
        throw new Error('Singleton required');
      }
    }
    return undefined;
  }

  /**
   * Modify or insert `entity` into named handle.
   * Modification is done by removing the old entity and reinserting the new one.
   */
  async updateCollection(handleName: string, entity: Entity): Promise<void> {
    // Set the entity into the right place in the set. If we find it
    // already present replace it, otherwise, add it.
    // TODO(dstockwell): Replace this with happy entity mutation approach.
    const handle = this.handles.get(handleName);
    if (handle) {
      if (handle instanceof Collection || handle instanceof BigCollection) {
        await handle.remove(entity);
        await handle.store(entity);
      } else {
        throw new Error('Collection required');
      }
    }
  }

  // TODO(sjmiles): experimental: high-level handle set
  // if handleName is an Singleton, then
  // - value can be a POJO or an Entity, value is `set`
  // if handleName is a Collection, then
  // - values must be an array of POJO
  // ^ needs more cases!
  async set(handleName, value) {
    const handle = this.handles.get(handleName);
    if (handle) {
      // TODO(sjmiles): cannot test class of `handle` because I have no
      // references to those classes, i.e. `handle is Singleton`, throws
      // because Singleton is undefined.
      if (handle.type['isEntity']) {
        const entity = value.entityClass ? value : new (handle.entityClass)(value);
        return await handle['set'](entity);
      }
      else if (handle.type['isCollection']) {
        if (Array.isArray(value)) {
          await this.clearHandle(name);
          await this.appendRawDataToHandle(name, value);
        }
      }
    }
  }

  /**
   * Return array of Entities dereferenced from array of Share-Type Entities
   */
  async derefShares(shares): Promise<Entity[]> {
    let entities = [];
    this.startBusy();
    try {
      const derefPromises = shares.map(async share => share.ref.dereference());
      entities = await Promise.all(derefPromises);
    } finally {
      this.doneBusy();
    }
    return entities;
  }

  /**
   * Returns array of Entities found in BOXED data `box` that are owned by `userid`
   */
  async boxQuery(box, userid): Promise<{}[]> {
    if (!box) {
      return [];
    } else {
      const matches = box.filter(item => userid === item.fromKey);
      return await this.derefShares(matches);
    }
  }
}
