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

    // successfully register particle for a slot.
    await slotManager.registerParticle(particleSpec, rootSlotid, "view");
    assert.equal(rootSlotid, slotManager._getParticleSlot(particleSpec).slotid);
    assert.equal(particleSpec, slotManager._getSlot(rootSlotid).particleSpec);

    // particle successfully release slot.
    slotManager.releaseParticle(particleSpec);
    assert.equal(undefined, slotManager._getParticleSlot(particleSpec));
    assert.equal(undefined, slotManager._getSlot(rootSlotid).particleSpec);
  });

  it('provide pending slot', async () => {
    let slotManager = new SlotManager(/* domRoot= */{}, /* pec= */ {});

    // successfully register particle for a slot.
    await slotManager.registerParticle(particleSpec, rootSlotid, "view");
    // register other particle for the same slot - added pending handler.
    let otherParticleSpec1 = util.initParticleSpec("OtherParticleSpec1");
    let pendingPromise1 = slotManager.registerParticle(otherParticleSpec1, rootSlotid, "view");
    pendingPromise1.done = false;
    var verifyPromise = (pendingParticleId) => {
      // verify released slot was provided to the pending particle.
      assert.equal(pendingParticleId, slotManager._getSlot(rootSlotid).particleSpec);
      assert.equal(undefined, slotManager._getParticleSlot(particleSpec));
      assert.equal(rootSlotid, slotManager._getParticleSlot(pendingParticleId).slotid);
    };
    pendingPromise1.then(() => { verifyPromise(otherParticleSpec1); pendingPromise1.done=true });

    let otherParticleSpec2 = util.initParticleSpec("OtherParticleSpec2");
    let pendingPromise2 = slotManager.registerParticle(otherParticleSpec2, rootSlotid, "view");
    pendingPromise2.done = false;
    pendingPromise2.then(() => { verifyPromise(otherParticleSpec2); pendingPromise2.done=true });

    // verify registered and pending slots.
    assert.equal(rootSlotid, slotManager._getParticleSlot(particleSpec).slotid);
    assert.equal(particleSpec, slotManager._getSlot(rootSlotid).particleSpec);
    // verify pending promises are still pending.
    assert.isFalse(pendingPromise1.done);
    assert.isFalse(pendingPromise2.done);

    // particle successfully release slot.
    slotManager.releaseParticle(particleSpec);

    // TODO(mmandlis): this test depends on the order the pending slots are provided, it shouldn't.
    await pendingPromise1;
    slotManager.releaseParticle(otherParticleSpec1);
    await pendingPromise2;
  });

  it('re-render inner slot content', async () => {
    let slotManager = new SlotManager(/* domRoot= */{}, /* pec= */ {});
    // successfully register particle for root slot and render it.
    await slotManager.registerParticle(particleSpec, rootSlotid, "view");
    slotManager.renderContent(particleSpec, `Foo<div slotid="${innerSlotid}"></div>`);

    // require inner and render inner slot.
    await slotManager.registerParticle(otherParticleSpec, innerSlotid);
    let innerSlotContent = "Bar";
    slotManager.renderContent(otherParticleSpec, innerSlotContent);
    assert.equal(innerSlotContent, slotManager._getSlot(innerSlotid)._dom.innerHTML);

    // re-render content of the root slot, and verify the inner slot content is preserved.
    slotManager.renderContent(particleSpec, `Not Foo<div slotid="${innerSlotid}"></div>`);
    assert.equal(innerSlotContent, slotManager._getSlot(innerSlotid)._dom.innerHTML);
  });

  it('provide pending inner slot', async () => {
    let slotManager = new SlotManager(/* domRoot= */{}, /* pec= */ {});
    // require inner slot
    let innerSlotPromise = slotManager.registerParticle(otherParticleSpec, innerSlotid);

    // successfully register particle and render root slot content.
    await slotManager.registerParticle(particleSpec, rootSlotid, "view");
    slotManager.renderContent(particleSpec, `Foo<div slotid="${innerSlotid}"></div>`);

    await innerSlotPromise;
  });

  it('release pending inner slot', async () => {
    let slotManager = new SlotManager(/* domRoot= */{}, /* pec= */ {});
    // require inner slot
    let innerSlotPromise = slotManager.registerParticle(otherParticleSpec, innerSlotid);
    // release particle, while slot request is still pending.
    slotManager.releaseParticle(otherParticleSpec);
    innerSlotPromise.then(function() {
      assert.fail('slot was released, promise should have been rejected.');
    }, function() {
    });
  });

  it('release inner slot', async () => {
    let slotManager = new SlotManager(/* domRoot= */{}, /* pec= */ {});
    // Register particle and render slot content
    await slotManager.registerParticle(particleSpec, rootSlotid, "view");
    slotManager.renderContent(particleSpec, `Foo<div slotid="${innerSlotid}"></div>`);
    // require inner slot
    await slotManager.registerParticle(otherParticleSpec, innerSlotid);
    assert.equal(innerSlotid, slotManager._getParticleSlot(otherParticleSpec).slotid);
    assert.equal(otherParticleSpec, slotManager._getSlot(innerSlotid).particleSpec);

    // release root slot and verify inner slot was released too.
    slotManager.releaseParticle(particleSpec);
    assert.equal(undefined, slotManager._getParticleSlot(otherParticleSpec));
    assert.isFalse(slotManager.hasSlot(innerSlotid));
  });

  it('three-level-nested-slots', async () => {
    let slotManager = new SlotManager(/* domRoot= */{}, /* pec= */ {});
    // Register and render 3 inner slots' content
    await slotManager.registerParticle(particleSpec, rootSlotid, "view");
    let rootContent = `Foo<div slotid="${innerSlotid}"></div>`;
    slotManager.renderContent(particleSpec, rootContent);
    await slotManager.registerParticle(otherParticleSpec, innerSlotid, "view");
    let subInnerSlotid = "sub";
    let innerContent = `Bar<div slotid="${subInnerSlotid}"></div>`;
    slotManager.renderContent(otherParticleSpec, innerContent);
    let subParticleSpec = util.initParticleSpec("SubParticle");
    await slotManager.registerParticle(subParticleSpec, subInnerSlotid, "view");
    let subInnerContent = "Bazzzz";
    slotManager.renderContent(subParticleSpec, subInnerContent);

    // Verify all 3 slots' content and mappings.
    let rootDom = slotManager._getSlot(rootSlotid)._dom;
    assert.equal(rootContent, rootDom.innerHTML);
    let innerDom = slotManager._getSlot(innerSlotid)._dom;
    assert.equal(innerContent, innerDom.innerHTML);
    assert.equal(subInnerContent, slotManager._getSlot(subInnerSlotid)._dom.innerHTML);

    // release mid-layer slot.
    slotManager.releaseParticle(otherParticleSpec);

    // Verify only root slot content remains
    assert.equal(rootContent, rootDom.innerHTML);
    assert.equal('', innerDom.innerHTML);
    assert.equal(undefined, slotManager._getParticleSlot(subParticleSpec));
    assert.isFalse(slotManager.hasSlot(subInnerSlotid));
  });
});
