/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
"use strict";

import assert from '../platform/assert-web.js';
import Template from './browser/lib/xen-template.js';

// TODO(sjmiles): should be elsewhere
// TODO(sjmiles): using Node syntax to import custom-elements in strictly-browser context
if (global.document) {
  require('./browser/lib/x-list.js');
  require('./browser/lib/model-select.js');
}

class DomContext {
  constructor(context, containerKind) {
    this._context = context;
    this._containerKind = containerKind;
    // TODO(sjmiles): _liveDom needs new name
    this._liveDom = null;
    this._innerContextBySlotName = {};
  }
  initContext(context) {
    assert(context);
    if (!this._context) {
      this._context = document.createElement(this._containerKind || 'div');
      context.appendChild(this._context);
    } else {
      assert(this._context.parentNode == context,
             'TODO: add support for moving slot to different context');
    }
  }
  isEqual(context) {
    return this._context.parentNode == context;
  }
  updateModel(model) {
    if (this._liveDom) {
      this._liveDom.set(model);
    }
  }
  clear() {
    if (this._liveDom) {
      this._liveDom.root.textContent = "";
    }
    this._liveDom = null;
    this._innerContextBySlotName = {};

  }
  stampTemplate(template, eventHandler) {
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
    let parentNode = slot.parentNode;
    while (parentNode) {
      if (parentNode == this._context) {
        return true;
      }
      if (parentNode.getAttribute("slotid")) {
        // this is an inner slot of an inner slot.
        return false;
      }
      parentNode = parentNode.parentNode;
    }
    assert(false);
  }
  initInnerContexts(slotSpec) {
    this._innerContextBySlotName = {};
    Array.from(this._context.querySelectorAll("[slotid]")).forEach(s => {
      if (!this.isDirectInnerSlot(s)) {
        // Skip inner slots of an inner slot of the given slot.
        return;
      }
      let slotId = s.getAttribute('slotid');
      let providedSlotSpec = slotSpec.providedSlots.find(ps => ps.name == slotId);
      if (providedSlotSpec) {  // Skip non-declared slots
        let subId = s.getAttribute('subid');
        assert(!subId || providedSlotSpec.isSet,
            `Slot provided in ${slotSpec.name} sub-id ${subId} doesn't match set spec: ${providedSlotSpec.isSet}`);
        if (providedSlotSpec.isSet) {
          if (!this._innerContextBySlotName[slotId]) {
            this._innerContextBySlotName[slotId] = {};
          }
          assert(!this._innerContextBySlotName[slotId][subId],
                 `Slot ${slotSpec.name} cannot provide multiple ${slotId}:${subId} inner slots`);
          this._innerContextBySlotName[slotId][subId] = s;
        } else {
          this._innerContextBySlotName[slotId] = s;
        }
      } else {
        console.warn(`Slot ${slotSpec.name} has unexpected inner slot ${slotId}`);
      }
    });
  }
  findRootSlots() {
    let innerSlotById = {};
    Array.from(this._context.querySelectorAll("[slotid]")).forEach(s => {
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
      eventHandler({
        handler: handlerName,
        data: {
          key: node.key,
          value: node.value
        }
      });
    });
  }
}

class SetDomContext {
  constructor(containerKind) {
    this._contextBySubId = {};
    this._containerKind = containerKind;
  }
  initContext(context) {
    Object.keys(context).forEach(subId => {
      if (!this._contextBySubId[subId] || !this._contextBySubId[subId].isEqual(context[subId])) {
        this._contextBySubId[subId] = new DomContext(null, this._containerKind);
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
  isEqual(context) {
    return Object.keys(this._contextBySubId).length == Object.keys(context).length &&
           !Object.keys(this._contextBySubId).find(c => this._contextBySubId[c] != context[c]);
  }
  updateModel(model) {
    assert(model.items, `Model must contain items`);
    model.items.forEach(item => {
      Object.keys(model).forEach(key => {
        if (key != 'items') {
          item[key] = model[key];
        }
      });
      if (this._contextBySubId[item.subId]) {
        this._contextBySubId[item.subId].updateModel(item);
      }
    });
  }
  clear() {
    Object.values(this._contextBySubId).forEach(context => context.clear());
  }
  stampTemplate(template, eventHandler, eventMapper) {
    Object.values(this._contextBySubId).forEach(context => context.stampTemplate(template, eventHandler, eventMapper));
  }
  observe(observer) {
    Object.values(this._contextBySubId).forEach(context => context.observe(observer));
  }
  getInnerContext(innerSlotName) {
    var innerContexts = {};
    Object.keys(this._contextBySubId).forEach(subId => {
      innerContexts[subId] = this._contextBySubId[subId].getInnerContext(innerSlotName);
    });
    return innerContexts;
  }
  initInnerContexts(slotSpec) {
    Object.values(this._contextBySubId).forEach(context => context.initInnerContexts(slotSpec));
  }
}

export default {DomContext, SetDomContext};
