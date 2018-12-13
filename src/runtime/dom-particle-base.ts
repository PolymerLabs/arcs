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
import {BigCollection} from './handle.js';
import {Collection} from './handle.js';
import {Variable} from './handle.js';


/**
 * Particle that interoperates with DOM.
 */
export class DomParticleBase extends Particle {
  private currentSlotName: string | undefined;

  constructor() {
    super();
  }
  /**
   * Override to return a String defining primary markup.
   */
  get template(): string {
    return '';
  }

  /**
   * Override to return a String defining primary markup for the given slot name.
   */
  getTemplate(slotName: string): string {
    // TODO: only supports a single template for now. add multiple templates support.
    return this.template;
  }

  /**
   * Override to return a String defining the name of the template for the given slot name.
   */
  getTemplateName(slotName: string): string {
    // TODO: only supports a single template for now. add multiple templates support.
    return `default`;
  }

  /**
   * Override to return false if the Particle won't use it's slot.
   */
  shouldRender(stateArgs?) {
    return true;
  }

  /**
   * Override to return a dictionary to map into the template.
   */
  render(stateArgs?) {
    return {};
  }

  renderSlot(slotName: string, contentTypes: string[]) {
    const stateArgs = this._getStateArgs();
    const slot = this.getSlot(slotName);

    if (!slot) {
      return; // didn't receive StartRender.
    }

    // Set this to support multiple slots consumed by a particle, without needing
    // to pass slotName to particle's render method, where it useless in most cases.
    this.currentSlotName = slotName;
    contentTypes.forEach(ct => slot.requestedContentTypes.add(ct));
    // TODO(sjmiles): redundant, same answer for every slot
    if (this.shouldRender(...stateArgs)) {
      const content: {templateName?, template?, model?} = {};
      if (slot.requestedContentTypes.has('template')) {
        content.template = this.getTemplate(slot.slotName);
      }
      if (slot.requestedContentTypes.has('model')) {
        content.model = this.render(...stateArgs);
      }
      content.templateName = this.getTemplateName(slot.slotName);

      // Backwards-compatibility and convenience code:
      //  - Rewrites slotid="slotName" to slotid$="{{$slotName}}" in templates.
      //  - Enhances the model with `$slotName` fields.
      if (slot.providedSlots.size > 0) {
        if (content.template) {
          if (typeof content.template === 'string') {
            content.template = this.slotNamesToModelReferences(slot, content.template);
          } else {
            content.template = Object.entries(content.template).reduce(
                (templateDictionary, [templateName, templateValue]) => {
                  templateDictionary[templateName] = this.slotNamesToModelReferences(slot, templateValue);
                return templateDictionary;
              }, {});
          }
        }
        if (content.model) {
          const slotIDs = {};
          slot.providedSlots.forEach((slotId, slotName) => slotIDs[`$${slotName}`] = slotId);
          content.model = this.enhanceModelWithSlotIDs(content.model, slotIDs);
        }
      }

      slot.render(content);
    } else if (slot.isRendered) {
      // Send empty object, to clear rendered slot contents.
      slot.render({});
    }
    this.currentSlotName = undefined;
  }
  private slotNamesToModelReferences(slot, template) {
    slot.providedSlots.forEach((slotId, slotName) => {
      // TODO: This is a simple string replacement right now,
      // ensuring that 'slotid' is an attribute on an HTML element would be an improvement.
      template = template.replace(new RegExp(`slotid=\"${slotName}\"`, 'gi'), `slotid$="{{$${slotName}}}"`);
    });
    return template;
  }
  // We put slot IDs at the top-level of the model as well as in models for sub-templates.
  // This is temporary and should go away when we move from sub-IDs to [(Entity, Slot)] constructs.
  private enhanceModelWithSlotIDs(model = {}, slotIDs, topLevel = true) {
    if (topLevel) {
      model = {...slotIDs, ...model};
    }
    if (model.hasOwnProperty('$template') && model.hasOwnProperty('models') && Array.isArray(model['models'])) {
      model['models'] = model['models'].map(m => this.enhanceModelWithSlotIDs(m, slotIDs));
    }
    for (const [key, value] of Object.entries(model)) {
      if (!!value && typeof value === 'object') {
      model[key] = this.enhanceModelWithSlotIDs(value, slotIDs, false);
      }
    }
    return model;
  }

  _getStateArgs() {
    return [];
  }

  forceRenderTemplate(slotName: string) {
    this.slotByName.forEach((slot, name) => {
      if (!slotName || (name === slotName)) {
        slot.requestedContentTypes.add('template');
      }
    });
  }

  fireEvent(slotName: string, {handler, data}) {
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
    return undefined;
  }

  /**
   * Remove all entities from named handle.
   */
  async clearHandle(handleName: string) {
    const handle = this.handles.get(handleName);
    if (handle instanceof Variable || handle instanceof Collection) {
      handle.clear();
    } else {
      throw new Error('Variable/Collection required');
    }
  }

  /**
   * Merge entities from Array into named handle.
   */
  async mergeEntitiesToHandle(handleName: string, entities): Promise<void> {
    const idMap = {};
    const handle = this.handles.get(handleName);
    if (handle instanceof Collection) {
      const handleEntities = await handle.toList();
      handleEntities.forEach(entity => idMap[entity.id] = entity);
      for (const entity of entities) {
        if (!idMap[entity.id]) {
          handle.store(entity);
        }
      }
    } else {
      throw new Error('Collection required');
    }
  }

  /**
   * Append entities from Array to named handle.
   */
  async appendEntitiesToHandle(handleName: string, entities): Promise<void> {
    const handle = this.handles.get(handleName);
    if (handle) {
      if (handle instanceof Collection || handle instanceof BigCollection) {
        Promise.all(entities.map(entity => handle.store(entity)));
      } else {
        throw new Error('Collection required');
      }
    }
  }

  /**
   * Create an entity from each rawData, and append to named handle.
   */
  async appendRawDataToHandle(handleName, rawDataArray): Promise<void> {
    const handle = this.handles.get(handleName);
    if (handle && handle.entityClass) {
      if (handle instanceof Collection || handle instanceof BigCollection) {
        // Typescript can't infer the type here and fails with TS2351
        // tslint:disable-next-line: no-any
        const entityClass: any = handle.entityClass;
        Promise.all(rawDataArray.map(raw => handle.store(new entityClass(raw))));
      } else {
        throw new Error('Collection required');
      }
    }
  }

  /**
   * Modify value of named handle. A new entity is created
   * from `rawData` (`new [EntityClass](rawData)`).
   */
  updateVariable(handleName: string, rawData) {
    const handle = this.handles.get(handleName);
    if (handle && handle.entityClass) {
      if (handle instanceof Variable) {
        // Typescript can't infer the type here and fails with TS2351
        // tslint:disable-next-line: no-any
        const entityClass: any = handle.entityClass;
        const entity = new entityClass(rawData);
        handle.set(entity);
        return entity;
      } else {
        throw new Error('Variable required');
      }
    }
    return undefined;
  }

  /**
   * Modify or insert `entity` into named handle.
   * Modification is done by removing the old entity and reinserting the new one.
   */
  async updateSet(handleName: string, entity): Promise<void> {
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

  /**
   * Returns array of Entities found in BOXED data `box` that are owned by `userid`
   */
  boxQuery(box, userid) {
    return box.filter(item => userid === item.getUserID().split('|')[0]);
  }
}
