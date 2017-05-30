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
let util = require('./test-util.js');

describe('slot', function() {
  it('assign and unassign slot', function() {
    let slot = new Slot('slotid');
    assert.isFalse(slot.hasParticle());

    // cannot unassign slot that wasn't assigned.
    assert.throws(() => { slot.unassignParticle() });

    // assign slot.
    let particleSpec = util.initParticleSpec('particle');
    slot.assignParticle(particleSpec);
    assert.isTrue(slot.hasParticle());
    // cannot assign slot that is already assigned.
    assert.throws(() => { slot.assignParticle(particleSpec); });
  });

  it('add and provide pending requests', function() {
    let slot = new Slot('slotid');
    assert.isFalse(slot.hasParticle());

    let count = 0;
    let handler = () => { count++; };

    slot.addPendingRequest(util.initParticleSpec('particle1'), handler, {});
    // Add request for the same particle, so it is ignored.
    slot.addPendingRequest(util.initParticleSpec('particle1'), handler, {});
    slot.addPendingRequest(util.initParticleSpec('particle2'), handler, {});
    slot.providePendingSlot();
    let expectedCount = 0;
    assert.equal(++expectedCount, count);
    slot.providePendingSlot();
    assert.equal(++expectedCount, count);
    // Slot has no pending requests, providing it does nothing.
    slot.providePendingSlot();
    assert.equal(expectedCount, count);

    // Cannot provide unassigned slot.
    slot.assignParticle(util.initParticleSpec('particle'));
    assert.throws(() => { slot.providePendingSlot(); });
    assert.equal(expectedCount, count);
  });
  it('remove pending request', function() {
    let slot = new Slot('slotid');
    let count = 0;
    let reject = () => { count++; };
    slot.addPendingRequest(util.initParticleSpec('particle1'), {}, reject);
    slot.removePendingRequest(util.initParticleSpec('particle1'));
    assert.equal(1, count);
  });
});
