/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {Entity, EntityClass} from './entity.js';
import {Handle, CollectionHandle, SingletonHandle} from './storageNG/handle.js';
import {Particle} from './particle.js';
import {CRDTTypeRecord} from './crdt/crdt.js';

export interface UiParticleConfig {
  handleNames: string[];
  slotNames: string[];
}

export type RenderModel = object;

/**
 * Particle that can render and process events.
 */
export class UiParticleBase extends Particle {
  /**
   * Override if necessary, to modify superclass config.
   */
  get config(): UiParticleConfig {
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
   * Invoke async function `task` with Particle busy-guard.
   */
  // tslint:disable-next-line: no-any
  async await(task: (p: this) => Promise<any>) {
    return await this.invokeSafely(task, this.onError);
  }

  /**
   * Set a singleton value. Value can be an Entity or a POJO.
   */
  async set(handleName: string, value: Entity | {}): Promise<void> {
    const handle = this._requireHandle(handleName);
    if (!(handle instanceof SingletonHandle)) {
      throw new Error(`Cannot set non-Singleton handle [${handleName}]`);
    }
    if (Array.isArray(value)) {
      throw new Error(`Cannot set an Array to Singleton handle [${handleName}]`);
    }
    return this.await(async p => await handle.set(this.requireEntity(value, handle.entityClass)));
  }

  /**
   * Add to a collection. Value can be an Entity or a POJO (or an Array of such values).
   */
  async add(handleName: string, value: Entity | {} | [Entity] | [{}]): Promise<void> {
    const handle = this._requireHandle(handleName);
    if (!(handle instanceof CollectionHandle)) {
      throw new Error(`Cannot add to non-Collection handle [${handleName}]`);
    }
    const entityClass = handle.entityClass;
    const data = Array.isArray(value) ? value : [value];
    return this.await(async p => {
      // remove pre-existing Entities (we will then re-add them, which is the mutation cycle)
      await this._remove(handle, data);
      // add (store) Entities, or Entities created from values
      await handle.addMultiple(data);
    });
  }

  private requireEntity(value: Entity | {}, entityClass: EntityClass, id?: string): Entity {
    return (value instanceof Entity) ? value : new (entityClass)(value);
  }

  /**
   * Remove from a collection. Value must be an Entity or an array of Entities.
   */
  async remove(handleName: string, value: Entity | [Entity]): Promise<void> {
    const handle = this._requireHandle(handleName);
    if (!(handle instanceof CollectionHandle)) {
      throw new Error(`Cannot remove from a non-Collection handle [${handleName}]`);
    }
    return this._remove(handle, value);
  }
  // tslint:disable-next-line: no-any
  private async _remove(handle: CollectionHandle<any>, value: Entity | {} | [Entity] | [{}]): Promise<void> {
    const data = Array.isArray(value) ? value : [value];
    return this.await(async p => Promise.all(
      data.map(async value => {
        if (value instanceof Entity && Entity.isIdentified(value)) {
          await handle.remove(value);
        }
      }
    )));
  }

  /**
   * Remove all entities from named handle.
   */
  async clear(handleName: string): Promise<void> {
    const handle = this._requireHandle(handleName);
    if (!(handle instanceof SingletonHandle) && !(handle instanceof CollectionHandle)) {
      throw new Error('Can only clear Singleton or Collection handles');
    }
    return this.await(p => handle.clear());
  }

  /**
   * Return the named handle or throw.
   */
  private _requireHandle(handleName): Handle<CRDTTypeRecord> {
    const handle = this.handles.get(handleName);
    if (!handle) {
      throw new Error(`Could not find handle [${handleName}]`);
    }
    return handle;
  }

  /**
   * Return array of Entities dereferenced from array of Share-Type Entities
   */
  async derefShares(shares): Promise<Entity[]> {
    return this.await(async p => {
      const derefPromises = shares.map(async share => share.ref.dereference());
      return await Promise.all(derefPromises);
    });
  }

  /**
   * Returns array of Entities found in BOXED data `box` that are owned by `userid`
   */
  async boxQuery(box, userid): Promise<{}[]> {
    if (!box) {
      return [];
    }
    const matches = box.filter(item => userid === item.fromKey);
    return await this.derefShares(matches);
  }
}
