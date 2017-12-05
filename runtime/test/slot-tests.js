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

import {assert} from './chai-web.js';
import Slot from "../slot.js";

describe("slot", function() {
  it("setting context", function() {
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
  it("hosted slots", function() {
    assert(true);
    let transformationSlotName = "myTransformationSlotName";
    let slot = new Slot({particle: {name: "myTransformationParticle"}, name: transformationSlotName}, "dummy-arc");
    let hostedSlotId = "id-0";
    let hostedParticleName = "particle-0";
    let hostedSlotName = "slot-0";
    let hostedParticle = { name: hostedParticleName };

    // Add hosted slot and verify it exists.
    assert.isUndefined(slot.getHostedSlot(hostedSlotId));
    slot.addHostedSlot(hostedSlotId, hostedParticleName, hostedSlotName);
    assert.isDefined(slot.getHostedSlot(hostedSlotId));

    // Init hosted slot.
    assert.isUndefined(slot.findHostedSlot(hostedParticle, hostedSlotName));
    slot.initHostedSlot(hostedSlotId, hostedParticle);
    assert.isDefined(slot.findHostedSlot(hostedParticle, hostedSlotName));

    let startRenderSlotNames = new Set();
    let stopRenderSlotNames = new Set();
    // Start render hosted slots
    slot.startRenderCallback = ({particle, slotName, contentTypes}) => { startRenderSlotNames.add(slotName); };
    slot.stopRenderCallback = ({particle, slotName}) => { stopRenderSlotNames.add(slotName); };
    slot.setContext("dummy-context");
    assert.equal(2, startRenderSlotNames.size);
    assert.isTrue(startRenderSlotNames.has(transformationSlotName));
    assert.isTrue(startRenderSlotNames.has(hostedSlotName));
    startRenderSlotNames.clear();

    // Add another hosted slot and have startRender trigger immediately.
    let otherHostedSlotId = "id-1";
    let otherHostedParticleName = "particle-1";
    let otherHostedSlotName = "slot-2";
    let otherHostedParticle = { name: otherHostedParticleName };
    slot.addHostedSlot(otherHostedSlotId, otherHostedParticleName, otherHostedSlotName);
    assert.isDefined(slot.getHostedSlot(otherHostedSlotId));
    slot.initHostedSlot(otherHostedSlotId, otherHostedParticle);
    assert.equal(1, startRenderSlotNames.size);
    assert.isTrue(startRenderSlotNames.has(otherHostedSlotName));

    // Trigger StopRender for both transformation and hosted slots.
    slot.setContext(null);
    assert.equal(3, stopRenderSlotNames.size);
    assert.isTrue(stopRenderSlotNames.has(transformationSlotName));
    assert.isTrue(stopRenderSlotNames.has(hostedSlotName));
    assert.isTrue(stopRenderSlotNames.has(otherHostedSlotName));
  });
});
