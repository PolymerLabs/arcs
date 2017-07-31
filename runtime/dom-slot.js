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

const assert = require('assert');
const Slot = require('./slot.js');
const Template = require('./browser/lib/xen-template.js');

// TODO(sjmiles): should be elsewhere
// TODO(sjmiles): using Node syntax to import custom-elements in strictly-browser context
if (global.document) {
  require('./browser/lib/x-list.js');
  require('./browser/lib/model-select.js');
  require('./browser/lib/interleaved-list.js');
}

let templates = new Map();

class DomSlot extends Slot {
  constructor(consumeConn) {
    super(consumeConn);
    this._templateName = `${this.consumeConn.particle.name}::${this.consumeConn.name}`;
    this._model = null;
    this._liveDom = null;
    this._innerContextBySlotName = null;
  }
  getTemplate() {
    return templates.get(this._templateName);
  }
  setContent(content, handler) {
    if (!content || Object.keys(content).length == 0) {
      this.clearContext();
      return;
    }
    if (!this.context) {
      return;
    }

    if (content.template) {
      templates.set(
        this._templateName,
        Object.assign(document.createElement('template'), {
          innerHTML: content.template
        }));
    }
    this.eventHandler = handler;
    if (Object.keys(content).indexOf("model") >= 0) {
      this._model = content.model;
    }
    return this.doRender();
  }
  doRender() {
    // Initialize template, if possible.
    if (this.getTemplate() && !this._liveDom) {
      this._stampTemplate();
    }
    // else {
    // TODO: should trigger request to particle, if template missing?
    //}
    if (this._liveDom && this._model) {
      this._liveDom.set(this._model);
    }
  }
  clearContext() {
    this.context.textContent = "";
    this._liveDom = null;
    this._model = null;
    this._innerContextBySlotName = null;
  }

  getInnerContext(slotName) {
    return this._innerContextBySlotName && this._innerContextBySlotName[slotName];
  }

  constructRenderRequest() {
    let request = ["model"];
    if (!this.getTemplate()) {
      request.push("template");
    }
    return request;
  }
  _stampTemplate() {
    assert(this.context);
    let eventMapper = this._eventMapper.bind(this, this.eventHandler);
    // TODO(sjmiles): hack to allow subtree elements (e.g. x-list) to marshal events
    this.context._eventMapper = eventMapper;
    // TODO(sjmiles): _liveDom needs new name
    this._liveDom = Template.stamp(this.getTemplate(), this.eventHandler);
    this._liveDom.mapEvents(eventMapper);
    this._liveDom.appendTo(this.context);

    // Note: need to store inner slot contexts before the inner slots have rendered their contexts
    // inside, as inner slots' particles may have inner slots with the same name.
    this._innerContextBySlotName = {};
    Array.from(this.context.querySelectorAll("[slotid]")).map(s => this._innerContextBySlotName[s.getAttribute('slotid')] = s);
  }
  _eventMapper(eventHandler, node, eventName, handlerName) {
    node.addEventListener(eventName, () => {
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

module.exports = DomSlot;
