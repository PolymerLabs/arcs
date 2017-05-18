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
let util = require('./test-util.js');

let particleSpec = util.initParticleSpec("RootParticle");
let otherParticleSpec = util.initParticleSpec("OtherParticleSpec");
let rootSlotid = "root";
let innerSlotid = "inner";

describe('slot manager', function() {
  it('register and release slots', async () => {
   let slotManager = new SlotManager(/* domRoot= */{}, /* pec= */ {});

    // successfully register a slot.
    await slotManager.registerSlot(particleSpec, rootSlotid, "view");
    assert.equal(rootSlotid, slotManager._getSlotId(particleSpec));
    assert.equal(particleSpec, slotManager._getParticle(rootSlotid));

    // successfully release slot.
    slotManager.releaseSlot(particleSpec);
    assert.equal(undefined, slotManager._getSlotId(particleSpec));
    assert.equal(undefined, slotManager._getParticle(rootSlotid));
  });

  it('provide pending slot', async () => {
    let slotManager = new SlotManager(/* domRoot= */{}, /* pec= */ {});

    // successfully register a slot.
    await slotManager.registerSlot(particleSpec, rootSlotid, "view");
    // register other particle for the same slot - added pending handler.
    let otherParticleSpec1 = util.initParticleSpec("OtherParticleSpec1");
    let pendingPromise1 = slotManager.registerSlot(otherParticleSpec1, rootSlotid, "view");
    pendingPromise1.done = false;
    var verifyPromise = (pendingParticleId) => {
      // verify released slot was provided to the pending particle.
      assert.equal(pendingParticleId, slotManager._getParticle(rootSlotid));
      assert.equal(undefined, slotManager._getSlotId(particleSpec));
      assert.equal(rootSlotid, slotManager._getSlotId(pendingParticleId));
    };
    pendingPromise1.then(() => { verifyPromise(otherParticleSpec1); pendingPromise1.done=true });

    let otherParticleSpec2 = util.initParticleSpec("OtherParticleSpec2");
    let pendingPromise2 = slotManager.registerSlot(otherParticleSpec2, rootSlotid, "view");
    pendingPromise2.done = false;
    pendingPromise2.then(() => { verifyPromise(otherParticleSpec2); pendingPromise2.done=true });

    // verify registered and pending slots.
    assert.equal(rootSlotid, slotManager._getSlotId(particleSpec));
    assert.equal(particleSpec, slotManager._getParticle(rootSlotid));
    // verify pending promises are still pending.
    assert.isFalse(pendingPromise1.done);
    assert.isFalse(pendingPromise2.done);

    // successfully release slot.
    slotManager.releaseSlot(particleSpec);

    // TODO(mmandlis): this test depends on the order the pending slots are provided, it shouldn't.
    await pendingPromise1;
    slotManager.releaseSlot(otherParticleSpec1);
    await pendingPromise2;
  });

  it('re-render inner slot', async () => {
    let slotManager = new SlotManager(/* domRoot= */{}, /* pec= */ {});
    // successfully register and render root slot.
    await slotManager.registerSlot(particleSpec, rootSlotid, "view");
    slotManager.renderSlot(particleSpec, `Foo<div slotid="${innerSlotid}"></div>`);

    // require inner and render inner slot.
    await slotManager.registerSlot(otherParticleSpec, innerSlotid);
    let innerSlotContent = "Bar";
    slotManager.renderSlot(otherParticleSpec, innerSlotContent);
    assert.equal(innerSlotContent, slotManager._getSlot(innerSlotid)._dom.innerHTML);

    // re-render content of the root slot, and verify the inner slot content is preserved.
    slotManager.renderSlot(particleSpec, `Not Foo<div slotid="${innerSlotid}"></div>`);
    assert.equal(innerSlotContent, slotManager._getSlot(innerSlotid)._dom.innerHTML);
  });

  it('provide pending inner slot', async () => {
    let slotManager = new SlotManager(/* domRoot= */{}, /* pec= */ {});
    // require inner slot
    let innerSlotPromise = slotManager.registerSlot(otherParticleSpec, innerSlotid);

    // successfully register and render root slot.
    await slotManager.registerSlot(particleSpec, rootSlotid, "view");
    slotManager.renderSlot(particleSpec, `Foo<div slotid="${innerSlotid}"></div>`);

    await innerSlotPromise;
  });

  it('release pending inner slot', async () => {
    let slotManager = new SlotManager(/* domRoot= */{}, /* pec= */ {});
    // require inner slot
    let innerSlotPromise = slotManager.registerSlot(otherParticleSpec, innerSlotid);
    // release particle, while slot request is still pending.
    slotManager.releaseSlot(otherParticleSpec);
    innerSlotPromise.then(function() {
      assert.fail('slot was released, promise should have been rejected.');
    }, function() {
    });
  });

  it('release inner slot', async () => {
    let slotManager = new SlotManager(/* domRoot= */{}, /* pec= */ {});
    // Register and render slot
    await slotManager.registerSlot(particleSpec, rootSlotid, "view");
    slotManager.renderSlot(particleSpec, `Foo<div slotid="${innerSlotid}"></div>`);
    // require inner slot
    await slotManager.registerSlot(otherParticleSpec, innerSlotid);
    assert.equal(innerSlotid, slotManager._getSlotId(otherParticleSpec));
    assert.equal(otherParticleSpec, slotManager._getParticle(innerSlotid));

    // release root slot and verify inner slot was released too.
    slotManager.releaseSlot(particleSpec);
    assert.equal(undefined, slotManager._getSlotId(otherParticleSpec));
    assert.equal(undefined, slotManager._getParticle(innerSlotid));
  });

  it('three-level-nested-slots', async () => {
    let slotManager = new SlotManager(/* domRoot= */{}, /* pec= */ {});
    // Register and render 3 inner slots
    await slotManager.registerSlot(particleSpec, rootSlotid, "view");
    let rootContent = `Foo<div slotid="${innerSlotid}"></div>`;
    slotManager.renderSlot(particleSpec, rootContent);
    await slotManager.registerSlot(otherParticleSpec, innerSlotid, "view");
    let subInnerSlotid = "sub";
    let innerContent = `Bar<div slotid="${subInnerSlotid}"></div>`;
    slotManager.renderSlot(otherParticleSpec, innerContent);
    let subParticleSpec = util.initParticleSpec("SubParticle");
    await slotManager.registerSlot(subParticleSpec, subInnerSlotid, "view");
    let subInnerContent = "Bazzzz";
    slotManager.renderSlot(subParticleSpec, subInnerContent);

    // Verify all 3 slots' content and mappings.
    let rootDom = slotManager._getSlot(rootSlotid)._dom;
    assert.equal(rootContent, rootDom.innerHTML);
    let innerDom = slotManager._getSlot(innerSlotid)._dom;
    assert.equal(innerContent, innerDom.innerHTML);
    assert.equal(subInnerContent, slotManager._getSlot(subInnerSlotid)._dom.innerHTML);

    // release mid-layer slot.
    slotManager.releaseSlot(otherParticleSpec);

    // Verify only root slot content remains
    assert.equal(rootContent, rootDom.innerHTML);
    assert.equal('', innerDom.innerHTML);
    assert.equal(undefined, slotManager._getSlotId(subParticleSpec));
    assert.equal(undefined, slotManager._getParticle(subInnerSlotid));
  });
});
