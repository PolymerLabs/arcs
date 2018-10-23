/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
'use strict';

import {assert} from '../platform/assert-web.js';
import {Particle} from './particle.js';

/** @class DomParticleBase
 * Particle that interoperates with DOM.
 */
export class DomParticleBase extends Particle {
  constructor() {
    super();
  }
  /** @method get template()
   * Override to return a String defining primary markup.
   */
  get template() {
    return '';
  }
  /** @method getTemplate(slotName)
   * Override to return a String defining primary markup for the given slot name.
   */
  getTemplate(slotName) {
    // TODO: only supports a single template for now. add multiple templates support.
    return this.template;
  }
  /** @method getTemplateName(slotName)
   * Override to return a String defining the name of the template for the given slot name.
   */
  getTemplateName(slotName) {
    // TODO: only supports a single template for now. add multiple templates support.
    return `default`;
  }
  /** @method shouldRender()
   * Override to return false if the Particle won't use
   * it's slot.
   */
  shouldRender() {
    return true;
  }
  /** @method render()
   * Override to return a dictionary to map into the template.
   */
  render() {
    return {};
  }
  renderSlot(slotName, contentTypes) {
    const stateArgs = this._getStateArgs();
    const slot = this.getSlot(slotName);
    if (!slot) {
      return; // didn't receive StartRender.
    }
    // Set this to support multiple slots consumed by a particle, without needing
    // to pass slotName to particle's render method, where it useless in most cases.
    this.currentSlotName = slotName;
    contentTypes.forEach(ct => slot._requestedContentTypes.add(ct));
    // TODO(sjmiles): redundant, same answer for every slot
    if (this.shouldRender(...stateArgs)) {
      const content = {};
      if (slot._requestedContentTypes.has('template')) {
        content.template = this.getTemplate(slot.slotName);
      }
      if (slot._requestedContentTypes.has('model')) {
        content.model = this.render(...stateArgs);
      }
      content.templateName = this.getTemplateName(slot.slotName);
      slot.render(content);
    } else if (slot.isRendered) {
      // Send empty object, to clear rendered slot contents.
      slot.render({});
    }
    this.currentSlotName = undefined;
  }
  _getStateArgs() {
    return [];
  }
  forceRenderTemplate(slotName) {
    this._slotByName.forEach((slot, name) => {
      if (!slotName || (name == slotName)) {
        slot._requestedContentTypes.add('template');
      }
    });
  }
  fireEvent(slotName, {handler, data}) {
    if (this[handler]) {
      this[handler]({data});
    }
  }
  setParticleDescription(pattern) {
    if (typeof pattern === 'string') {
      return super.setParticleDescription(pattern);
    }
    assert(!!pattern.template && !!pattern.model, 'Description pattern must either be string or have template and model');
    super.setDescriptionPattern('_template_', pattern.template);
    super.setDescriptionPattern('_model_', JSON.stringify(pattern.model));
  }
  /** @method clearHandle(handleName)
   * Remove entities from named handle.
   */
  async clearHandle(handleName) {
    const handle = this.handles.get(handleName);
    if (handle.clear) {
      handle.clear();
    } else {
      const entities = await handle.toList();
      if (entities) {
        return Promise.all(entities.map(entity => handle.remove(entity)));
      }
    }
  }
  /** @method mergeEntitiesToHandle(handleName, entityArray)
   * Merge entities from Array into named handle.
   */
  async mergeEntitiesToHandle(handleName, entities) {
    const idMap = {};
    const handle = this.handles.get(handleName);
    const handleEntities = await handle.toList();
    handleEntities.forEach(entity => idMap[entity.id] = entity);
    for (const entity of entities) {
      if (!idMap[entity.id]) {
        handle.store(entity);
      }
    }
    //Promise.all(entities.map(entity => !idMap[entity.id] && handle.store(entity)));
    //Promise.all(entities.map(entity => handle.store(entity)));
  }
  /** @method appendEntitiesToHandle(handleName, entityArray)
   * Append entities from Array to named handle.
   */
  async appendEntitiesToHandle(handleName, entities) {
    const handle = this.handles.get(handleName);
    if (handle) {
      Promise.all(entities.map(entity => handle.store(entity)));
    }
  }
  /** @method appendRawDataToHandle(handleName, rawDataArray)
   * Create an entity from each rawData, and append to named handle.
   */
  async appendRawDataToHandle(handleName, rawDataArray) {
    const handle = this.handles.get(handleName);
    if (handle) {
      Promise.all(rawDataArray.map(raw => handle.store(new (handle.entityClass)(raw))));
    }
  }
  /** @method updateVariable(handleName, rawData)
   * Modify value of named handle. A new entity is created
   * from `rawData` (`new [EntityClass](rawData)`).
   */
  updateVariable(handleName, rawData) {
    const handle = this.handles.get(handleName);
    if (handle) {
      const entity = new (handle.entityClass)(rawData);
      handle.set(entity);
      return entity;
    }
  }
  /** @method updateSet(handleName, entity)
   * Modify or insert `entity` into named handle.
   * Modification is done by removing the old entity and reinserting the new one.
   */
  async updateSet(handleName, entity) {
    // Set the entity into the right place in the set. If we find it
    // already present replace it, otherwise, add it.
    // TODO(dstockwell): Replace this with happy entity mutation approach.
    const handle = this.handles.get(handleName);
    if (handle) {
      // const entities = await handle.toList();
      // const target = entities.find(r => r.id === entity.id);
      // if (target) {
      //   handle.remove(target);
      // }
      handle.remove(entity);
      handle.store(entity);
    }
  }
  /** @method boxQuery(box, userid)
   * Returns array of Entities found in BOXED data `box` that are owned by `userid`
   */
  boxQuery(box, userid) {
    return box.filter(item => userid === item.getUserID().split('|')[0]);
  }
}
