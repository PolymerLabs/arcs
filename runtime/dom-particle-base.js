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
  /** @method shouldRender(props, state, oldProps, oldState)
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
    let slot = this.getSlot(slotName);
    if (!slot) {
      return; // didn't receive StartRender.
    }
    // Set this to support multiple slots consumed by a particle, without needing
    // to pass slotName to particle's render method, where it useless in most cases.
    this.currentSlotName = slotName;
    contentTypes.forEach(ct => slot._requestedContentTypes.add(ct));
    // TODO(sjmiles): redundant, same answer for every slot
    if (this.shouldRender(...stateArgs)) {
      let content = {};
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
      const data = this._props[handleName];
      if (data) {
        return Promise.all(data.map(entity => handle.remove(entity)));
      }
    }
  }
  /** @method appendRawDataToHandle(handleName, rawDataArray)
   * Create an entity from each rawData, and append to named handle.
   */
  appendRawDataToHandle(handleName, rawDataArray) {
    const handle = this.handles.get(handleName);
    const entityClass = handle.entityClass;
    rawDataArray.forEach(raw => {
      handle.store(new entityClass(raw));
    });
  }
  /** @method updateVariable(handleName, record)
   * Modify value of named handle. A new entity is created
   * from `record` (`new <EntityClass>(record)`).
   */
  updateVariable(handleName, record) {
    const handle = this.handles.get(handleName);
    const newRecord = new (handle.entityClass)(record);
    handle.set(newRecord);
    return newRecord;
  }
  /** @method updateSet(handleName, record)
   * Modify or insert `record` into named handle.
   * Modification is done by removing the old record and reinserting the new one.
   */
  updateSet(handleName, entity) {
    // Set the entity into the right place in the set. If we find it
    // already present replace it, otherwise, add it.
    // TODO(dstockwell): Replace this with happy entity mutation approach.
    const handle = this.handles.get(handleName);
    const records = this._props[handleName];
    const target = records.find(r => r.id === entity.id);
    if (target) {
      handle.remove(target);
    }
    handle.store(entity);
  }
  /** @method boxQuery(box, userid)
   * Returns array of Entities found in BOXED data `box` that are owned by `userid`
   */
  boxQuery(box, userid) {
    return box.filter(item => userid === item.getUserID().split('|')[0]);
  }
}
