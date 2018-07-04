/**
 * @license
 * Copyright (c) 2018 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {assert} from '../../platform/assert-web.js';

export class SlotRenderer {
  constructor(slotContext, slotConsumer, containerKind) {
    this._slotContext = slotContext;
    this._slotConsumer = slotConsumer; // Slot
    this._containerKind = containerKind;

    // Contains `container` and renderer specific info (eg model, template for dom renderer).
    // Key is `undefined` for singleton slot.
    this._infoBySubId = new Map();

    this._eventHandler = null; // set by slot-composer
    this._innerContainerBySlotName = {};
  }

  get slotContext() { return this._slotContext; }
  get slotConsumer() { return this._slotConsumer; }

  get slotSpec() {
    if (this.slotConsumer) {
      return this.slotConsumer.consumeConn.slotSpec;
    }
  }
  get isSetContainer() { 
    return this.slotSpec && this.slotSpec.isSet;
  }

  getInfo(subId) { return this._infoBySubId.get(subId); } 
  get infos() { return [...this._infoBySubId.entries()]; }

  onContextContainerUpdate() {
    let contextContainerBySubId = new Map();
    if (this.isSetContainer) {
      Object.keys(this.slotContext.container || {}).forEach(subId => contextContainerBySubId.set(subId, this.slotContext.container[subId]));
    } else {
      contextContainerBySubId.set(undefined, this.slotContext.container);
    }

    for (let [subId, container] of contextContainerBySubId) {
      if (!this._infoBySubId.has(subId)) {
        this._infoBySubId.set(subId, {});
      }
      let info = this._infoBySubId.get(subId);
      if (!info.container || this.isSameContainer(info.container, container)) {
        info.container = this.createNewContainer(container, subId);
      }
    }
    for (let [subId, info] of this._infoBySubId) {
      if (!contextContainerBySubId.has(subId)) {
        this.deleteContainer(info.container);
        this._infoBySubId.delete(subId);
      }
    }
  }

  setContent(content, handler) {
    this._eventHandler = handler;
    for (let [subId, info] of this._infoBySubId) {
      this.setContainerContent(info, this.formatContent(content, subId), subId);
    }
  }

  clear() {
    for (let [subId, container] of this._infoBySubId) {
      this.clearContainer(info);
    }
  }

  getProvidedContainer(providedSlotName) {
    return this._innerContainerBySlotName[providedSlotName];
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

  // abstract
  isSameContainer(container, contextContainer) {}
  createNewContainer(contextContainer, subId) {}
  deleteContainer(container, subId) {}
  setContainerContent(info, content, subId) {}
  formatContent(content, subId) {}
  constructRenderRequest(slotConsumer) {}
  clearContainer(info) {}
  dispose() {}

  static findRootContainers(topContainer) {}
  static clear(container) {}
}
