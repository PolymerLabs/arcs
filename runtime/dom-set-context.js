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
import Template from '../shell/components/xen/xen-template.js';
import {DomContext} from './dom-context.js';

export class DomSetContext {
  constructor(containerKind) {
    this._contextBySubId = {};
    this._containerKind = containerKind;
  }
  initContext(context) {
    Object.keys(context).forEach(subId => {
      if (!this._contextBySubId[subId] || !this._contextBySubId[subId].isEqual(context[subId])) {
        this._contextBySubId[subId] = new DomContext(null, this._containerKind);
        this._contextBySubId[subId].subId = subId;
      }
      this._contextBySubId[subId].initContext(context[subId]);
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
      templates[''] = DomContext.createTemplateElement(template);
    } else {
      Object.keys(template).forEach(subId => {
        templates[subId] = this._contextBySubId[subId].createTemplateElement(template[subId]);
      });
    }
    return templates;
  }
  stampTemplate(template, eventHandler, eventMapper) {
    Object.keys(this._contextBySubId).forEach(subId => {
      let templateForSubId = template[subId] || template[''];
      if (templateForSubId) {
        this._contextBySubId[subId].stampTemplate(templateForSubId, eventHandler, eventMapper);
      }
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
