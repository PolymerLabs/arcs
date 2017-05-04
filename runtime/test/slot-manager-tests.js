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
var SlotManager = require("../slot-manager.js");

let particleid = "particleid";
let rootSlotid = "root";

describe('slot manager', function() {
  it('register and release slots', async () => {
   let slotManager = new SlotManager(/* domRoot= */{}, /* pec= */ {});

    // successfully register a slot.
    await slotManager.registerSlot(particleid, rootSlotid, "view");
    assert.equal(rootSlotid, slotManager._getSlotId(particleid));
    assert.equal(particleid, slotManager._getParticle(rootSlotid));

    // successfully release slot.
    slotManager.releaseSlot(particleid);
    assert.equal(undefined, slotManager._getSlotId(particleid));
    assert.equal(undefined, slotManager._getParticle(rootSlotid));
  });

  it('provide pending slot', async () => {
    let slotManager = new SlotManager(/* domRoot= */{}, /* pec= */ {});

    // successfully register a slot.
    await slotManager.registerSlot(particleid, rootSlotid, "view");
    // register other particle for the same slot - added pending handler.
    let otherParticleid1 = "other-particleid-1";
    let pendingPromise1 = slotManager.registerSlot(otherParticleid1, rootSlotid, "view");
    pendingPromise1.done = false;
    var verifyPromise = (pendingParticleId) => {
      // verify released slot was provided to the pending particle.
      assert.equal(pendingParticleId, slotManager._getParticle(rootSlotid));
      assert.equal(undefined, slotManager._getSlotId(particleid));
      assert.equal(rootSlotid, slotManager._getSlotId(pendingParticleId));
    };
    pendingPromise1.then(() => { verifyPromise(otherParticleid1); pendingPromise1.done=true });

    let otherParticleid2 = "other-particleid-2";
    let pendingPromise2 = slotManager.registerSlot(otherParticleid2, rootSlotid, "view");
    pendingPromise2.done = false;
    pendingPromise2.then(() => { verifyPromise(otherParticleid2); pendingPromise2.done=true });

    // verify registered and pending slots.
    assert.equal(rootSlotid, slotManager._getSlotId(particleid));
    assert.equal(particleid, slotManager._getParticle(rootSlotid));
    assert.equal(1, Object.keys(slotManager._pendingSlotRequests).length);
    assert.equal(2, Object.keys(slotManager._pendingSlotRequests[rootSlotid]).length);
    // verify pending promises are still pending.
    assert.isFalse(pendingPromise1.done);
    assert.isFalse(pendingPromise2.done);

    // successfully release slot.
    slotManager.releaseSlot(particleid);

    // TODO(mmandlis): this test depends on the order the pending slots are provided, it shoudln't.
    await pendingPromise1;
    slotManager.releaseSlot(otherParticleid1);
    await pendingPromise2;
  });

});
