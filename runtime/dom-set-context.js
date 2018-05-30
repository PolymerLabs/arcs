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
import {DomContext} from './dom-context.js';

// Class for rendering set slots. Stores a map from entity subID to its corresponding DomContext object.
export class DomSetContext {
  constructor(containerKind, contextClass) {
    this._contextBySubId = {};
    this._containerKind = containerKind;
    this._contextClass = contextClass || DomContext;
  }
  initContext(context) {
    Object.keys(context).forEach(subId => {
      let subContext = this._contextBySubId[subId];
      if (!subContext || !subContext.isEqual(context[subId])) {
        // Replace the context corresponding to subId with a newly created context,
        // while maintaining the template name.
        subContext = new this._contextClass(null, this._containerKind, subId, subContext ? subContext._templateName : null);
        this._contextBySubId[subId] = subContext;
      }
      subContext.initContext(context[subId]);
    });
    // Delete sub-contexts that are not found in the new context.
    Object.keys(this._contextBySubId).forEach(subId => {
      if (!context[subId]) {
        delete this._contextBySubId[subId];
      }
    });
  }
  updateParticleName(slotName, particleName) {
    Object.values(this._contextBySubId).forEach(context => context.updateParticleName(slotName, particleName));
  }
  isEqual(context) {
    return Object.keys(this._contextBySubId).length == Object.keys(context).length &&
           !Object.keys(this._contextBySubId).find(c => this._contextBySubId[c] != context[c]);
  }
  setTemplate(templatePrefix, templateName, template) {
    let isStringTemplateName = typeof templateName == 'string';
    let isStringTemplate = typeof template == 'string';
    Object.keys(this._contextBySubId).forEach(subId => {
      let templateNameForSubId = isStringTemplateName ? templateName : templateName[subId];
      if (templateNameForSubId) {
        let templateForSubId = (!template || isStringTemplate) ? template : template[templateNameForSubId];
        this._contextBySubId[subId].setTemplate(templatePrefix, templateNameForSubId, templateForSubId);
      }
    });
  }
  hasTemplate(templatePrefix) {
    return this._contextClass.hasTemplate(templatePrefix);
  }
  updateModel(model) {
    assert(model.items, `Model must contain items`);
    model.items.forEach(item => {
      // Properties from item override properties from model.
      item = Object.assign(Object.assign({}, model), item);
      delete item.items;
      if (this._contextBySubId[item.subId]) {
        this._contextBySubId[item.subId].updateModel(item);
      }
    });
  }
  clear() {
    Object.values(this._contextBySubId).forEach(context => context.clear());
  }
  createTemplateElement(template) {
    let templates = {};
    if (typeof template === 'string') {
      return this._contextClass.createTemplateElement(template);
    } else {
      Object.keys(template).forEach(subId => {
        templates[subId] = this._contextBySubId[subId].createTemplateElement(template[subId]);
      });
    }
    return templates;
  }
  stampTemplate(eventHandler, eventMapper) {
    Object.keys(this._contextBySubId).forEach(subId => {
      this._contextBySubId[subId].stampTemplate(eventHandler, eventMapper);
    });
  }
  observe(observer) {
    Object.values(this._contextBySubId).forEach(context => context.observe(observer));
  }
  getInnerContext(innerSlotName) {
    let innerContexts = {};
    Object.keys(this._contextBySubId).forEach(subId => {
      innerContexts[subId] = this._contextBySubId[subId].getInnerContext(innerSlotName);
    });
    return innerContexts;
  }
  initInnerContexts(slotSpec) {
    Object.keys(this._contextBySubId).forEach(subId => this._contextBySubId[subId].initInnerContexts(slotSpec, subId));
  }
  isDirectInnerSlot(slot) {
    return Object.values(this._contextBySubId).find(context => context.isDirectInnerSlot(slot)) != null;
  }
}
