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

class Slot {
  constructor(consumeConn) {
    assert(consumeConn);
    this._consumeConn = consumeConn;
    this._context = null;
    this.startRenderCallback = null;
    this.stopRenderCallback = null;

  }
  get context() { return this._context; }
  get consumeConn() { return this._consumeConn; }
  setContext(context) {
    // do nothing, if context unchanged.
    if (this.context == context) {
      return;
    }
    // clear existing context, before resetting it.
    if (this.context) {
      this.clearContext();
    }

    // update the context;
    this._context = context;
    if (this.context) {
      this.startRender();
    } else {
      this.clearContext();
      this.stopRender();
    }
  }
  canRender() {
    return this.context && this.content;
  }
  startRender() {
    if (this.startRenderCallback) {
      this.startRenderCallback({
        particle: this.consumeConn.particle,
        slotName: this.consumeConn.name,
        contentTypes: this.constructRenderRequest()
      });
    }
  }
  stopRender() {
    if (this.stopRenderCallback) {
      this.stopRenderCallback &&
      this.stopRenderCallback({
        particle: this.consumeConn.particle.spec,
        slotName: this.consumeConn.name
      });
    }
  }
  // absract
  setContent(content, handler) {}
  doRender() {}
  clearContext() {}
  getInnerContext(slotName) {}
  constructRenderRequest() {}
}

module.exports = Slot;
