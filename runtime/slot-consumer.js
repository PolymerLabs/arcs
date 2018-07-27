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
import {SlotContext} from './slot-context.js';

export class SlotConsumer {
  constructor(consumeConn, containerKind) {
    this._consumeConn = consumeConn;
    this._slotContext = null; // SlotContext
    this._providedSlotContexts = []; // SlotContext[]

    this.startRenderCallback = null;
    this.stopRenderCallback = null;

    this._containerKind = containerKind;

    // Contains `container` and other affordance specific rendering information
    // (eg for `dom`: model, template for dom renderer) by sub id. Key is `undefined` for singleton slot.
    this._renderingBySubId = new Map();
    this._eventHandler = null;
    this._innerContainerBySlotName = {};
  }
  get consumeConn() { return this._consumeConn; }
  get slotContext() { return this._slotContext; }
  set slotContext(slotContext) { this._slotContext = slotContext; }
  getRendering(subId) { return this._renderingBySubId.get(subId); } 
  get renderings() { return [...this._renderingBySubId.entries()]; }

  onContainerUpdate(newContainer, originalContainer) {
    if (Boolean(newContainer) !== Boolean(originalContainer)) {
      if (newContainer) {
        this.startRender();
      } else {
        this.stopRender();
      }
    }

    if (newContainer != originalContainer) {
      let contextContainerBySubId = new Map();
      if (this.consumeConn && this.consumeConn.slotSpec.isSet) {
        Object.keys(this.slotContext.container || {}).forEach(subId => contextContainerBySubId.set(subId, this.slotContext.container[subId]));
      } else {
        contextContainerBySubId.set(undefined, this.slotContext.container);
      }

      for (let [subId, container] of contextContainerBySubId) {
        if (!this._renderingBySubId.has(subId)) {
          this._renderingBySubId.set(subId, {});
        }
        let rendering = this.getRendering(subId);
        if (!rendering.container || !this.isSameContainer(rendering.container, container)) {
          if (rendering.container) {
            // The rendering already had a container, but it's changed. The original container needs to be cleared.
            this.clearContainer(rendering);
          }
          rendering.container = this.createNewContainer(container, subId);
        }
      }
      for (let [subId, rendering] of this.renderings) {
        if (!contextContainerBySubId.has(subId)) {
          this.deleteContainer(rendering.container);
          this._renderingBySubId.delete(subId);
        }
      }
    }
  }

  createProvidedContexts() {
    return this.consumeConn.slotSpec.providedSlots.map(
      spec => new SlotContext(this.consumeConn.providedSlots[spec.name].id, spec.name, /* tags=*/ [], /* container= */ null, spec, this));
  }

  updateProvidedContexts() {
    this._providedSlotContexts.forEach(providedContext => {
      providedContext.container = this.getInnerContainer(providedContext.name);
    });
  }

  startRender() {
    if (this.consumeConn && this.startRenderCallback) {
      this.startRenderCallback({
        particle: this.consumeConn.particle,
        slotName: this.consumeConn.name,
        contentTypes: this.constructRenderRequest()
      });
    }
  }

  stopRender() {
    if (this.consumeConn && this.stopRenderCallback) {
      this.stopRenderCallback({particle: this.consumeConn.particle, slotName: this.consumeConn.name});
    }
  }

  async setContent(content, handler, arc) {
    if (content && Object.keys(content).length > 0) {
      if (arc) {
        content.descriptions = await this.populateHandleDescriptions(arc);
      }
    }
    this._eventHandler = handler;
    for (let [subId, rendering] of this.renderings) {
      this.setContainerContent(rendering, this.formatContent(content, subId), subId);
    }
  }

  async populateHandleDescriptions(arc) {
    let descriptions = {};
    await Promise.all(Object.values(this.consumeConn.particle.connections).map(async handleConn => {
      if (handleConn.handle) {
        descriptions[`${handleConn.name}.description`] = (await arc.description.getHandleDescription(handleConn.handle)).toString();
      }
    }));
    return descriptions;
  }

  getInnerContainer(providedSlotName) {
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

  isSameContainer(container, contextContainer) { return container == contextContainer; }

  // abstract
  constructRenderRequest() {}
  dispose() {}
  createNewContainer(contextContainer, subId) {}
  deleteContainer(container, subId) {}
  setContainerContent(rendering, content, subId) {}
  formatContent(content, subId) {}
  formatHostedContent(hostedSlot, content) {}
  static clear(container) {}
}
