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

const templateByName = new Map();

export class DomContext {
  constructor(context, containerKind, subId, templateName) {
    this._context = context;
    this._containerKind = containerKind;
    // TODO(sjmiles): _liveDom needs new name
    this._liveDom = null;
    this._innerContextBySlotName = {};
    this._templateName = templateName || null;
    this._subId = subId || null;
  }
  get subId() {return this._subId; }
  set subId(subId) { this._subId = subId; }
  static clear(context) {
    context.textContent = '';
  }
  static createContext(context, content) {
    let domContext = new DomContext(context);
    domContext._stampTemplate(domContext.createTemplateElement(content.template), () => {});
    domContext.updateModel(content.model);
    return domContext;
  }
  initContext(context) {
    assert(context);
    if (!this._context) {
      this._context = document.createElement(this._containerKind || 'div');
      this._setParticleName('');
      context.appendChild(this._context);
    } else {
      //assert(this._context.parentNode == context, 'TODO: add support for moving slot to different context');
    }
  }
  updateParticleName(slotName, particleName) {
    this._setParticleName(`${slotName}::${particleName}`);
  }
  _setParticleName(name) {
    this._context.setAttribute('particle-host', name);
  }
  get context() { return this._context; }
  isEqual(context) {
    return this._context.parentNode == context;
  }
  setTemplate(templatePrefix, templateName, template) {
    this._templateName = [templatePrefix, templateName].filter(s => s).join('::');
    if (template) {
      if (templateByName.has(this._templateName)) {
        // TODO: check whether the new template is different from the one that was previously used.
        // Template is being replaced.
        this.clear();
      }
      templateByName.set(this._templateName, this.createTemplateElement(template));
    }
  }
  hasTemplate(templatePrefix) {
    return DomContext.hasTemplate(templatePrefix);
  }
  static hasTemplate(templatePrefix) {
    return [...templateByName.keys()].find(key => key.startsWith(templatePrefix));
  }
  static dispose() {
    // empty template cache
    templateByName.clear();
  }
  updateModel(model) {
    if (this._liveDom) {
      this._liveDom.set(model);
    }
  }
  clear() {
    if (this._liveDom) {
      this._liveDom.root.textContent = '';
    }
    this._liveDom = null;
    this._innerContextBySlotName = {};
  }
  static createTemplateElement(template) {
    return Object.assign(document.createElement('template'), {innerHTML: template});
  }
  createTemplateElement(template) {
    return DomContext.createTemplateElement(template);
  }
  stampTemplate(eventHandler) {
    if (this._templateName) {
      let template = templateByName.get(this._templateName);
      assert(template, `No template for ${this._templateName}`);
      this._stampTemplate(template, eventHandler);
    }
  }
  _stampTemplate(template, eventHandler) {
    if (!this._liveDom) {
      // TODO(sjmiles): hack to allow subtree elements (e.g. x-list) to marshal events
      this._context._eventMapper = this._eventMapper.bind(this, eventHandler);
      this._liveDom = Template
          .stamp(template)
          .events(this._context._eventMapper)
          .appendTo(this._context);
    }
  }
  observe(observer) {
    observer.observe(this._context, {childList: true, subtree: true});
  }
  getInnerContext(innerSlotName) {
    return this._innerContextBySlotName[innerSlotName];
  }
  isDirectInnerSlot(slot) {
    if (slot === this._context) {
      return true;
    }
    let parentNode = slot.parentNode;
    while (parentNode) {
      if (parentNode == this._context) {
        return true;
      }
      if (parentNode.getAttribute('slotid')) {
        // this is an inner slot of an inner slot.
        return false;
      }
      parentNode = parentNode.parentNode;
    }
    assert(false);
  }
  // get a value from node that could be an attribute, if not a property
  getNodeValue(node, name) {
    // TODO(sjmiles): remember that attribute names from HTML are lower-case
    return node[name] || node.getAttribute(name);
  }
  initInnerContexts(slotSpec) {
    this._innerContextBySlotName = {};
    Array.from(this._context.querySelectorAll('[slotid]')).forEach(elem => {
      if (!this.isDirectInnerSlot(elem)) {
        // Skip inner slots of an inner slot of the given slot.
        return;
      }
      const slotId = this.getNodeValue(elem, 'slotid');
      const providedSlotSpec = slotSpec.getProvidedSlotSpec(slotId);
      if (!providedSlotSpec) { // Skip non-declared slots
        console.warn(`Slot ${slotSpec.name} has unexpected inner slot ${slotId}`);
        return;
      }
      const subId = this.getNodeValue(elem, 'subid');
      this._validateSubId(providedSlotSpec, subId);
      this._initInnerSlotContext(slotId, subId, elem);
    });
  }
  _initInnerSlotContext(slotId, subId, elem) {
    if (subId) {
      if (!this._innerContextBySlotName[slotId]) {
        this._innerContextBySlotName[slotId] = {};
      }
      assert(!this._innerContextBySlotName[slotId][subId], `Multiple ${slotId}:${subId} inner slots cannot be provided`);
      this._innerContextBySlotName[slotId][subId] = elem;
    } else {
      this._innerContextBySlotName[slotId] = elem;
    }
  }
  _validateSubId(providedSlotSpec, subId) {
    assert(!this.subId || !subId || this.subId == subId, `Unexpected sub-id ${subId}, expecting ${this.subId}`);
    assert(Boolean(this.subId || subId) === providedSlotSpec.isSet,
        `Sub-id ${subId} for provided slot ${providedSlotSpec.name} doesn't match set spec: ${providedSlotSpec.isSet}`);
  }
  findRootSlots() {
    let innerSlotById = {};
    Array.from(this._context.querySelectorAll('[slotid]')).forEach(s => {
      assert(this.isDirectInnerSlot(s), 'Unexpected inner slot');
      let slotId = s.getAttribute('slotid');
      assert(!innerSlotById[slotId], `Duplicate root slot ${slotId}`);
      innerSlotById[slotId] = s;
    });
    return innerSlotById;
  }
  _eventMapper(eventHandler, node, eventName, handlerName) {
    node.addEventListener(eventName, event => {
      // TODO(sjmiles): we have an extremely minimalist approach to events here, this is useful IMO for
      // finding the smallest set of features that we are going to need.
      // First problem: click event firing multiple times as it bubbles up the tree, minimalist solution
      // is to enforce a 'first listener' rule by executing `stopPropagation`.
      event.stopPropagation();
      // propagate keyboard information
      const {altKey, ctrlKey, metaKey, shiftKey, code, key, repeat} = event;
      eventHandler({
        handler: handlerName,
        data: {
          // TODO(sjmiles): this is a data-key (as in key-value pair), may be confusing vs `keys`
          key: node.key,
          value: node.value,
          keys: {altKey, ctrlKey, metaKey, shiftKey, code, key, repeat}
        }
      });
    });
  }
}
