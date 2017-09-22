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
const {DomContext, SetDomContext} = require('./dom-context.js');

let templates = new Map();

class DomSlot extends Slot {
  constructor(consumeConn, arc) {
    super(consumeConn, arc);
    this._templateName = `${this.consumeConn.particle.name}::${this.consumeConn.name}`;
    this._model = null;

    this._observer = this._initMutationObserver();
  }

  get context() { return super.context;  }
  set context(context) {
    let wasNull = true;
    if (this._context) {
      this._context.clear();
      wasNull = false;
    }

    if (context) {
      if (!this._context) {
        this._context = this._createDomContext();
      }
      this._context.initContext(context);
      if (!wasNull) {
        this._doRender();
      }
    } else {
      this._context = null;
    }
  }
  _createDomContext() {
    return this.consumeConn.slotSpec.isSet ? new SetDomContext() : new DomContext();
  }
  _initMutationObserver() {
    return new MutationObserver(() => {
      this._observer.disconnect();

      if (this.context) {
        // Update inner slots.
        this.context.initInnerContexts(this.consumeConn.slotSpec);
        this.innerSlotsUpdateCallback(this);

        // Reactivate the observer.
        this.context.observe(this._observer);
      }
    });
  }
  _createTemplateElement(template) {
    return Object.assign(document.createElement('template'), { innerHTML: template});
  }
  isSameContext(context) {
    return this.context.isEqual(context);
  }

  getTemplate() {
    return templates.get(this._templateName);
  }

  setContent(content, handler) {
    if (!content || Object.keys(content).length == 0) {
      if (this.context) {
        this.context.clear();
      }
      this._model = null;
      return;
    }
    if (!this.context) {
      return;
    }

    if (content.template) {
      if (this.getTemplate()) {
        // Template is being replaced.
        this.context.clear();
      }
      templates.set(this._templateName, this._createTemplateElement(content.template));
    }
    this.eventHandler = handler;
    if (Object.keys(content).indexOf("model") >= 0) {
      this._model = content.model;
    }
    return this._doRender();
  }
  _doRender() {
    assert(this.context);

    this.context.observe(this._observer);

    // Initialize template, if possible.
    if (this.getTemplate()) {
      this.context.stampTemplate(this.getTemplate(), this.eventHandler);
    }
    // else {
    // TODO: should trigger request to particle, if template missing?
    //}

    if (this._model) {
      this._model = Object.assign(this._model, this.populateViewDescriptions());
      this.context.updateModel(this._model);
    }
  }
  getInnerContext(slotName) {
    return this.context && this.context.getInnerContext(slotName);
  }
  constructRenderRequest() {
    let request = ["model"];
    if (!this.getTemplate()) {
      request.push("template");
    }
    return request;
  }
  static findRootSlots(context) {
    let domContext = new DomContext(context);
    return domContext.findRootSlots(context);
  }
}

module.exports = DomSlot;
