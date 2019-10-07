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

export interface UiParticleConfig {
  handleNames: string[];
  slotNames: string[];
}

export type RenderModel = object;

/**
 * Particle that can render and process events.
 */
export class UiParticleBase extends Particle {
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
  render(...args): RenderModel {
    return {};
  }

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
   * invoke async function `task` with Particle busy-guard
   */
  async await(task: (p: this) => Promise<any>) {
    return await this.invokeSafely(task, err => { throw(err); });
  }

  /**
   * Set handle value. Value can be an Entity or a POJO (or an Array of such values, for a Collection)
   */
  async set(handleName, value: Entity | Object | [Entity] | [Object]) {
    await this.await(p => p._set(handleName, value));
  }
  async _set(handleName, value: Entity | Object | [Entity] | [Object]) {
    const handle = this.handles.get(handleName);
    if (!handle) {
      throw new Error(`Could not find handle [${handleName}]`);
    } else {
      if (handle instanceof Singleton) {
        if (Array.isArray(value)) {
          throw new Error(`Cannot set an Array to Singleton handle [${handleName}]`);
        }
        const entity = (value instanceof Entity) ? value : new (handle.entityClass)(value);
        return await handle['set'](entity);
      }
      else if (handle instanceof Collection) {
        await this.clear(name);
        if (value instanceof Entity) {
          await handle.remove(value);
          await handle.store(value);
        } else {
          this.add(handleName, value);
        }
      }
    }
  }

  /**
   * Add to a collection. Value can be an Entity or a POJO (or an Array of such values)
   */
  async add(handleName, value: Entity | Object | [Entity] | [Object]) {
    const handle = this.handles.get(handleName);
    if (!handle) {
      throw new Error(`Could not find handle [${handleName}]`);
    } else {
      if (!(handle instanceof Collection)) {
        throw new Error(`Cannot add to non-Collection handle [${handleName}]`);
      } else {
        const data = Array.isArray(value) ? value : [value];
        const entityClass = handle.entityClass;
        this.await(p => Promise.all(data.map(
          value => handle.store(value instanceof Entity ? value : new entityClass(value)))
        ));
      }
    }
  }

  /**
   * Remove from a collection. Value can be an Entity or a POJO (or an Array of such values)
   */
  async remove(handleName, value: Entity | Object | [Entity] | [Object]) {
    const handle = this.handles.get(handleName);
    if (!handle) {
      throw new Error(`Could not find handle [${handleName}]`);
    } else {
      if (!(handle instanceof Collection)) {
        throw new Error(`Cannot remove from a non-Collection handle [${handleName}]`);
      } else {
        const data = Array.isArray(value) ? value : [value];
        this.await(p => Promise.all(
          data.map(async value => {
            if (value instanceof Entity) {
              handle.remove(value)
            }
          }
        )));
      }
    }
  }

  /**
   * Remove all entities from named handle.
   */
  async clear(handleName: string): Promise<void> {
    const handle = this.handles.get(handleName);
    if (handle instanceof Singleton || handle instanceof Collection) {
      return this.await(p => handle.clear());
    } else {
      throw new Error('Singleton/Collection required');
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
