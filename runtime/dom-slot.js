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
import {digest} from '../platform/digest-web.js';
import {Slot} from './slot.js';
import {DomContext} from './dom-context.js';
import {DomSetContext} from './dom-set-context.js';

export class DomSlot extends Slot {
  constructor(consumeConn, arc, containerKind) {
    super(consumeConn, arc);
    this._model = null;
    this._observer = this._initMutationObserver();
    this._containerKind = containerKind;
  }
  get templatePrefix() {
    return `${this.consumeConn.particle.name}::${this.consumeConn.name}`;
  }

  setContext(context) {
    let wasNull = true;
    if (this.getContext()) {
      this.getContext().clear();
      wasNull = false;
    }

    if (context) {
      if (!this.getContext()) {
        this._context = this._createDomContext();
      }
      this.getContext().initContext(context);
      if (!wasNull) {
        this._doRender();
      }
    } else {
      this._context = null;
    }
  }
  _createDomContext() {
    if (this.consumeConn.slotSpec.isSet) {
      return new DomSetContext(this._containerKind);
    }
    return new DomContext(null, this._containerKind);
  }
  dispose() {
    this._observer.disconnect();
  }
  _initMutationObserver() {
    const observer = new MutationObserver(async (records) => {
      this._observer.disconnect();
      if (this.getContext() && records.some(r => this.getContext().isDirectInnerSlot(r.target))) {
        // Update inner slots.
        this.getContext().initInnerContexts(this.consumeConn.slotSpec);
        this.innerSlotsUpdateCallback(this);
        // Reactivate the observer.
        this.getContext().observe(this._observer);
      }
    });
    return observer;
  }
  isSameContext(context) {
    return this.getContext().isEqual(context);
  }
  // TODO(sjmiles): triggered when innerPEC sends Render message to outerPEC,
  // (usually by request of DomParticle::render())
  // `handler` is generated by caller (slot-composer::renderSlot())
  async setContent(content, handler) {
    if (!content || Object.keys(content).length == 0) {
      if (this.getContext()) {
        this.getContext().clear();
        this.innerSlotsUpdateCallback && this.innerSlotsUpdateCallback(this);
      }
      this._model = null;
      return;
    }
    if (!this.getContext()) {
      return;
    }
    if (content.templateName) {
      this.getContext().setTemplate(this.templatePrefix, content.templateName, content.template);
    }
    this.eventHandler = handler;
    if (Object.keys(content).indexOf('model') >= 0) {
      if (content.model) {
        this._model = Object.assign(content.model, await this.populateHandleDescriptions());
      } else {
        this._model = undefined;
      }
    }
    this._doRender();
  }
  _doRender() {
    assert(this.getContext());

    this.getContext().observe(this._observer);

    this.getContext().stampTemplate(this.eventHandler);

    if (this._model) {
      this.getContext().updateModel(this._model);
    }
  }
  getInnerContext(slotName) {
    return this.getContext() && this.getContext().getInnerContext(slotName);
  }
  constructRenderRequest(hostedSlot) {
    let request = ['model'];
    let prefixes = [this.templatePrefix];
    if (hostedSlot) {
      prefixes.push(hostedSlot.particle.name);
      prefixes.push(hostedSlot.slotName);
    }
    if (!this.getContext().hasTemplate(prefixes.join('::'))) {
      request.push('template');
    }
    return request;
  }
  formatHostedContent(hostedSlot, content) {
    if (content.templateName) {
      if (typeof content.templateName == 'string') {
        content.templateName = `${hostedSlot.particleName}::${hostedSlot.slotName}::${content.templateName}`;
      } else {
        // TODO(mmandlis): add support for hosted particle rendering set slot.
        assert(false, 'TODO: Implement this!');
      }
    }
    return content;
  }
  static findRootSlots(context) {
    return new DomContext(context, this._containerKind).findRootSlots(context);
  }
}
