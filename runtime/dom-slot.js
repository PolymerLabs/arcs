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
  constructor(consumeConn) {
    super(consumeConn);
    this._templateName = `${this.consumeConn.particle.name}::${this.consumeConn.name}`;
    this._context = null;
    this._model = null;

    this._observer = new MutationObserver(() => {
      this._observer.disconnect();
      this.context.initInnerContexts(this.consumeConn.slotSpec);
      this.innerSlotsUpdateCallback(this);
    });
  }

  get context() { return this._context; }
  set context(context) {
    let wasNull = true;
    if (this._context) {
      this._context.clear();
      wasNull = false;
    }

    if (context) {
      if (!this._context) {
        this._context = this.consumeConn.slotSpec.isSet ? new SetDomContext() : new DomContext();
      }
      this._context.initContext(context);
      if (!wasNull) {
        this._doRender();
      }
    } else {
      this._context = null;
    }
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
}

module.exports = DomSlot;
