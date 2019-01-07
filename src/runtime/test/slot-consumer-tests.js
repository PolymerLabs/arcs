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
import {SlotConsumer} from '../slot-consumer.js';
import {ProvidedSlotContext} from '../slot-context.js';

describe('slot consumer', function() {
  it('setting container', async () => {
    const spec = {isSet: false};
    const slot = new SlotConsumer(null /* arc */, {name: 'dummy-consumeConn', slotSpec: {spec}});
    slot.slotContext = new ProvidedSlotContext('dummy-context', 'dummy', [], null, spec, null);
    let startRenderCount = 0;
    let stopRenderCount = 0;
    slot.startRenderCallback = () => { ++startRenderCount; };
    slot.stopRenderCallback = () => { ++stopRenderCount; };

    // container was null, set to null: nothing happens.
    slot.onContainerUpdate(null);
    assert.equal(startRenderCount, 0);
    assert.equal(stopRenderCount, 0);

    // context was null, set to non-null: startRender is called.
    slot.onContainerUpdate('dummy-container', null);
    assert.equal(startRenderCount, 1);
    assert.equal(stopRenderCount, 0);

    // context was not null, set to another non-null context: nothing happens.
    assert.isFalse(slot.isSameContainer(slot.getRendering().container, 'other-container'));
    slot.onContainerUpdate('other-container', 'dummy-container');
    assert.equal(startRenderCount, 1);
    assert.equal(stopRenderCount, 0);

    // context was not null, set to null: stopRender is called.
    slot.onContainerUpdate(null, 'other-container');
    assert.equal(startRenderCount, 1);
    assert.equal(stopRenderCount, 1);
  });
});
