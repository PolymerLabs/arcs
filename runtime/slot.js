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

// TODO: rename to SlotConsumer and move to slot/
export class Slot {
  constructor(arc, consumeConn) {
    assert(arc);
    this._arc = arc;
    this._consumeConn = consumeConn;
    this._renderer = null; // SlotRenderer
    this._providedSlotContexts = []; // SlotContext[]

    this.startRenderCallback = null;
    this.stopRenderCallback = null;
  }
  get consumeConn() { return this._consumeConn; }
  get arc() { return this._arc; }
  get renderer() { return this._renderer; }
  set renderer(renderer) { this._renderer = renderer; }

  onContainerUpdate(container, originalContainer) {
    if (Boolean(container) != Boolean(originalContainer)) {
      if (container) {
        this.startRender();
      } else {
        this.stopRender();
      }
    }
    if (container != originalContainer) {
      //assert(this._renderer, 'no renderer :(');
      if (this.renderer) {
        this.renderer.onContextContainerUpdate();
      }
    }
  }

  updateProvidedContexts() {
    this._providedSlotContexts.forEach(providedContext => {
      providedContext.container = this.renderer.getProvidedContainer(providedContext.name);
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

  async populateHandleDescriptions() {
    let descriptions = {};
    await Promise.all(Object.values(this.consumeConn.particle.connections).map(async handleConn => {
      if (handleConn.handle) {
        descriptions[`${handleConn.name}.description`] = (await this._arc.description.getHandleDescription(handleConn.handle)).toString();
      }
    }));
    return descriptions;
  }

  async setContent(content, handler) {
    if (content && Object.keys(content).length > 0) {
      content.descriptions = await this.populateHandleDescriptions();
    }
    this.renderer.setContent(content, handler);
  }

  constructRenderRequest() {
    return this.renderer.constructRenderRequest();
  }

  dispose() {
    this.renderer && this.renderer.dispose();
  }
}
