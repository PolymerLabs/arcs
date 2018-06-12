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
  constructor(container, containerKind, subId, templateName) {
    this._container = container; // html node, e.g. <div>
    this._containerKind = containerKind; // string, e.g 'div'
    // TODO(sjmiles): _liveDom needs new name
    this._liveDom = null;
    this._innerContainerBySlotName = {};
    this._templateName = templateName || null;
    this._subId = subId || null;
  }
  get subId() {return this._subId; }
  set subId(subId) { this._subId = subId; }
  static clear(container) {
    container.textContent = '';
  }
  static createContext(container, content) {
    let context = new DomContext(container);
    context._stampTemplate(context.createTemplateElement(content.template), () => {});
    context.updateModel(content.model);
    return context;
  }
  initContainer(container) {
    assert(container);
    if (!this._container) {
      this._container = document.createElement(this._containerKind || 'div');
      this._setParticleName('');
      container.appendChild(this._container);
    } else {
      //assert(this._container.parentNode == container, 'TODO: add support for moving slot to different container');
    }
  }
  updateParticleName(slotName, particleName) {
    this._setParticleName(`${slotName}::${particleName}`);
  }
  _setParticleName(name) {
    this._container.setAttribute('particle-host', name);
  }
  get container() { return this._container; }
  isSameContainer(container) {
    return this._container.parentNode == container;
  }
  setTemplate(templatePrefix, templateName, template) {
    this._templateName = [templatePrefix, templateName].filter(s => s).join('::');
    if (typeof template === 'string') {
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
    this._innerContainerBySlotName = {};
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
      this._container._eventMapper = this._eventMapper.bind(this, eventHandler);
      this._liveDom = Template
          .stamp(template)
          .events(this._container._eventMapper)
          .appendTo(this._container);
    }
  }
  observe(observer) {
    observer.observe(this._container, {childList: true, subtree: true});
  }
  getInnerContainer(innerSlotName) {
    return this._innerContainerBySlotName[innerSlotName];
  }
  isDirectInnerSlot(container) {
    if (container === this._container) {
      return true;
    }
    let parentNode = container.parentNode;
    while (parentNode) {
      if (parentNode == this._container) {
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
  initInnerContainers(slotSpec) {
    this._innerContainerBySlotName = {};
    Array.from(this._container.querySelectorAll('[slotid]')).forEach(container => {
      if (!this.isDirectInnerSlot(container)) {
        // Skip inner slots of an inner slot of the given slot.
        return;
      }
      const slotId = this.getNodeValue(container, 'slotid');
      const providedSlotSpec = slotSpec.getProvidedSlotSpec(slotId);
      if (!providedSlotSpec) { // Skip non-declared slots
        console.warn(`Slot ${slotSpec.name} has unexpected inner slot ${slotId}`);
        return;
      }
      const subId = this.getNodeValue(container, 'subid');
      this._validateSubId(providedSlotSpec, subId);
      this._initInnerSlotContainer(slotId, subId, container);
    });
  }
  _initInnerSlotContainer(slotId, subId, container) {
    if (subId) {
      if (!this._innerContainerBySlotName[slotId]) {
        this._innerContainerBySlotName[slotId] = {};
      }
      assert(!this._innerContainerBySlotName[slotId][subId], `Multiple ${slotId}:${subId} inner slots cannot be provided`);
      this._innerContainerBySlotName[slotId][subId] = container;
    } else {
      this._innerContainerBySlotName[slotId] = container;
    }
  }
  _validateSubId(providedSlotSpec, subId) {
    assert(!this.subId || !subId || this.subId == subId, `Unexpected sub-id ${subId}, expecting ${this.subId}`);
    assert(Boolean(this.subId || subId) === providedSlotSpec.isSet,
        `Sub-id ${subId} for provided slot ${providedSlotSpec.name} doesn't match set spec: ${providedSlotSpec.isSet}`);
  }
  findRootContainers() {
    let containerBySlotId = {};
    Array.from(this._container.querySelectorAll('[slotid]')).forEach(container => {
      assert(this.isDirectInnerSlot(container), 'Unexpected inner slot');
      let slotId = container.getAttribute('slotid');
      assert(!containerBySlotId[slotId], `Duplicate root slot ${slotId}`);
      containerBySlotId[slotId] = container;
    });
    return containerBySlotId;
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
