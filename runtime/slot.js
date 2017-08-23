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
    this.startRenderCallback = null;
    this.stopRenderCallback = null;

  }
  get consumeConn() { return this._consumeConn; }

  setContext(context) {
    // do nothing, if context unchanged.
    if ((!this.context && !context) ||
        (this.context && this.context.isEqual(context))) {
      return;
    }

    // update the context;
    let wasNull = !this.context;
    this.context = context;
    if (this.context) {
      if (wasNull) {
        this.startRender();
      }
    } else {
      this.stopRender();
    }
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
        particle: this.consumeConn.particle,
        slotName: this.consumeConn.name
      });
    }
  }
  // absract
  get context() { assert('not implemented'); }
  set context(context) { assert('not implemented'); }
  setContent(content, handler) {}
  getInnerContext(slotName) {}
  constructRenderRequest() {}
}

module.exports = Slot;
