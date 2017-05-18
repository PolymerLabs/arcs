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
  it('associate and disassociate slot', function() {
    let slot = new Slot('slotid');
    assert.isFalse(slot.isAssociated());

    // cannot disassociate not associated slot.
    assert.throws(() => { slot.disassociateParticle() });

    // associate slot.
    let particleSpec = util.initParticleSpec('particle');
    slot.associateWithParticle(particleSpec);
    assert.isTrue(slot.isAssociated());
    // cannot associate slot that is already associated.
    assert.throws(() => { slot.associateWithParticle(particleSpec); });
  });

  it('add and provide pending requests', function() {
    let slot = new Slot('slotid');
    assert.isFalse(slot.isAssociated());

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

    // Cannot provide not associated slot.
    slot.associateWithParticle(util.initParticleSpec('particle'));
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
