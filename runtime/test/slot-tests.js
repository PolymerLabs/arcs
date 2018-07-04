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

import {assert} from './chai-web.js';
import {Slot} from '../slot.js';
import {MockSlotDomRenderer} from '../testing/mock-slot-dom-renderer.js';

// Add tests for slot-context & slot-consumer & slot-renderer! 
describe('slot', function() {
  it('setting container', async () => {
    let slot = new Slot('dummy-consumeConn', 'dummy-arc');
    let startRenderCount = 0;
    let stopRenderCount = 0;
    slot.startRenderCallback = () => { ++startRenderCount; };
    slot.stopRenderCallback = () => { ++stopRenderCount; };
    slot.renderer = new MockSlotDomRenderer({}, slot);

    // container was null, set to null: nothing happens.
    slot.onContainerUpdate(null);
    assert.equal(startRenderCount, 0);
    assert.equal(stopRenderCount, 0);

    // context was null, set to non-null: startRender is called.
    slot.onContainerUpdate('dummy-container', null);
    assert.equal(startRenderCount, 1);
    assert.equal(stopRenderCount, 0);

    // context was not null, set to another non-null context: nothing happens.
    assert.isFalse(slot.renderer.isSameContainer(slot.renderer.getInfo().container, 'other-container'));
    slot.onContainerUpdate('other-container', 'dummy-container');
    assert.equal(startRenderCount, 1);
    assert.equal(stopRenderCount, 0);

    // context was not null, set to null: stopRender is called.
    slot.onContainerUpdate(null, 'other-container');
    assert.equal(startRenderCount, 1);
    assert.equal(stopRenderCount, 1);
  });
});
