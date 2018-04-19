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
import Slot from '../slot.js';

describe('slot', function() {
  it('updates context', async () => {
    let slot = new Slot('dummy-consumeConn', 'dummy-arc');
    let contextInitCount = 0;
    slot.onContextInitialized = () => { ++ contextInitCount; };
    assert.isNull(slot.getContext());

    // context was null, set to null: nothing happens.
    await slot.updateContext(null);
    assert.isNull(slot.getContext());
    assert.equal(contextInitCount, 0);

    // context was null, set to non-null: context initialization callback triggered
    await slot.updateContext('dummy-context');
    assert.isNotNull(slot.getContext());
    assert.equal(contextInitCount, 1);

    // context was not null, set to another non-null context: nothing happens.
    assert.isFalse(slot.isSameContext('other-context'));
    await slot.updateContext('other-context');
    assert.isNotNull(slot.getContext());
    assert.equal(contextInitCount, 1);

    // context was not null, set to null.
    await slot.updateContext(null);
    assert.isNull(slot.getContext());
    assert.equal(contextInitCount, 1);
  });
  it('renders hosted slots', async () => {
    let transformationSlotName = 'myTransformationSlotName';
    let slot = new Slot({particle: {name: 'myTransformationParticle'}, name: transformationSlotName}, 'dummy-arc');
    let hostedSlotId = 'id-0';
    let hostedParticleName = 'particle-0';
    let hostedSlotName = 'slot-0';
    let hostedParticle = {name: hostedParticleName};

    // Add hosted slot and verify it exists.
    assert.isUndefined(slot.getHostedSlot(hostedSlotId));
    slot.addHostedSlot(hostedSlotId, hostedParticleName, hostedSlotName);
    assert.isDefined(slot.getHostedSlot(hostedSlotId));

    // Init hosted slot.
    assert.isUndefined(slot.findHostedSlot(hostedParticle, hostedSlotName));
    slot.initHostedSlot(hostedSlotId, hostedParticle);
    assert.isDefined(slot.findHostedSlot(hostedParticle, hostedSlotName));

    // Render hosted slots.
    let hostedSlotIds = [];
    slot.hostedSlotUpdateCallback = (hostedSlotId, content) => { hostedSlotIds.push(hostedSlotId); };
    slot.setHostedSlotContent(hostedSlotId, 'content');
    await slot.updateContext('dummy-context');
    assert.deepEqual([hostedSlotId], hostedSlotIds);
    hostedSlotIds = [];

    // Add another hosted slot and have hosted slot update callback trigger immediately.
    let otherHostedSlotId = 'id-1';
    let otherHostedParticleName = 'particle-1';
    let otherHostedSlotName = 'slot-2';
    let otherHostedParticle = {name: otherHostedParticleName};
    slot.addHostedSlot(otherHostedSlotId, otherHostedParticleName, otherHostedSlotName);
    assert.isDefined(slot.getHostedSlot(otherHostedSlotId));
    slot.initHostedSlot(otherHostedSlotId, otherHostedParticle);
    slot.setHostedSlotContent(otherHostedSlotId, 'other-content');
    assert.deepEqual([otherHostedSlotId], hostedSlotIds);
    hostedSlotIds = [];

    // Slot context set to null - hosted slot update callback is not triggered.
    await slot.updateContext(null);
    slot.setHostedSlotContent(hostedSlotId, 'new-content');
    slot.setHostedSlotContent(otherHostedSlotId, 'new-other-content');
    assert.lengthOf(hostedSlotIds, 0);
    assert.equal('new-content', slot.getHostedSlot(hostedSlotId).content);
    assert.equal('new-other-content', slot.getHostedSlot(otherHostedSlotId).content);
  });
});
