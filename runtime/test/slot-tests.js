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

const assert = require('chai').assert;
var Slot = require("../slot.js");

describe('slot', function() {
  it('setting context', function() {
    let slot = new Slot("dummy-consumeConn", "dummy-arc");
    let startRenderCount = 0;
    let stopRenderCount = 0;
    slot.startRenderCallback = () => { ++startRenderCount; };
    slot.stopRenderCallback = () => { ++stopRenderCount; };

    // context was null, set to null: nothing happens.
    slot.setContext(null);
    assert.equal(startRenderCount, 0);
    assert.equal(stopRenderCount, 0);

    // context was null, set to non-null: startRender is called.
    slot.setContext("dummy-context");
    assert.equal(startRenderCount, 1);
    assert.equal(stopRenderCount, 0);

    // context was not null, set to another non-null context: nothing happens.
    assert.isFalse(slot.isSameContext("other-context"));
    slot.setContext("other-context");
    assert.equal(startRenderCount, 1);
    assert.equal(stopRenderCount, 0);

    // context was not null, set to null: stopRender is called.
    slot.setContext(null);
    assert.equal(startRenderCount, 1);
    assert.equal(stopRenderCount, 1);
  });
});
