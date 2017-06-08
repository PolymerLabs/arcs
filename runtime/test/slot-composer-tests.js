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
var SlotComposer = require("../slot-composer.js");
let util = require('./test-util.js');

let particleSpec = util.initParticleSpec("RootParticle");
let otherParticleSpec = util.initParticleSpec("OtherParticleSpec");
let rootSlotid = "root";
let innerSlotid = "inner";

describe('slot composer', function() {
  it('register and release slots', async () => {
   let slotComposer = new SlotComposer(/* domRoot= */{}, /* pec= */ {});

    // successfully register a slot.
    await slotComposer.registerSlot(particleSpec, rootSlotid, "view");
    assert.equal(rootSlotid, slotComposer._getSlotId(particleSpec));
    assert.equal(particleSpec, slotComposer._getParticle(rootSlotid));

    // successfully release slot.
    slotComposer.releaseSlot(particleSpec);
    assert.equal(undefined, slotComposer._getSlotId(particleSpec));
    assert.equal(undefined, slotComposer._getParticle(rootSlotid));
  });

  it('provide pending slot', async () => {
    let slotComposer = new SlotComposer(/* domRoot= */{}, /* pec= */ {});

    // successfully register a slot.
    await slotComposer.registerSlot(particleSpec, rootSlotid, "view");
    // register other particle for the same slot - added pending handler.
    let otherParticleSpec1 = util.initParticleSpec("OtherParticleSpec1");
    let pendingPromise1 = slotComposer.registerSlot(otherParticleSpec1, rootSlotid, "view");
    pendingPromise1.done = false;
    var verifyPromise = (pendingParticleId) => {
      // verify released slot was provided to the pending particle.
      assert.equal(pendingParticleId, slotComposer._getParticle(rootSlotid));
      assert.equal(undefined, slotComposer._getSlotId(particleSpec));
      assert.equal(rootSlotid, slotComposer._getSlotId(pendingParticleId));
    };
    pendingPromise1.then(() => { verifyPromise(otherParticleSpec1); pendingPromise1.done=true });

    let otherParticleSpec2 = util.initParticleSpec("OtherParticleSpec2");
    let pendingPromise2 = slotComposer.registerSlot(otherParticleSpec2, rootSlotid, "view");
    pendingPromise2.done = false;
    pendingPromise2.then(() => { verifyPromise(otherParticleSpec2); pendingPromise2.done=true });

    // verify registered and pending slots.
    assert.equal(rootSlotid, slotComposer._getSlotId(particleSpec));
    assert.equal(particleSpec, slotComposer._getParticle(rootSlotid));
    // verify pending promises are still pending.
    assert.isFalse(pendingPromise1.done);
    assert.isFalse(pendingPromise2.done);

    // successfully release slot.
    slotComposer.releaseSlot(particleSpec);

    // TODO(mmandlis): this test depends on the order the pending slots are provided, it shouldn't.
    await pendingPromise1;
    slotComposer.releaseSlot(otherParticleSpec1);
    await pendingPromise2;
  });

  it('re-render inner slot', async () => {
    let slotComposer = new SlotComposer(/* domRoot= */{}, /* pec= */ {});
    // successfully register and render root slot.
    await slotComposer.registerSlot(particleSpec, rootSlotid, "view");
    slotComposer.renderSlot(particleSpec, `Foo<div slotid="${innerSlotid}"></div>`);

    // require inner and render inner slot.
    await slotComposer.registerSlot(otherParticleSpec, innerSlotid);
    let innerSlotContent = "Bar";
    slotComposer.renderSlot(otherParticleSpec, innerSlotContent);
    assert.equal(innerSlotContent, slotComposer._getSlot(innerSlotid)._dom.innerHTML);

    // re-render content of the root slot, and verify the inner slot content is preserved.
    slotComposer.renderSlot(particleSpec, `Not Foo<div slotid="${innerSlotid}"></div>`);
    assert.equal(innerSlotContent, slotComposer._getSlot(innerSlotid)._dom.innerHTML);
  });

  it('provide pending inner slot', async () => {
    let slotComposer = new SlotComposer(/* domRoot= */{}, /* pec= */ {});
    // require inner slot
    let innerSlotPromise = slotComposer.registerSlot(otherParticleSpec, innerSlotid);

    // successfully register and render root slot.
    await slotComposer.registerSlot(particleSpec, rootSlotid, "view");
    slotComposer.renderSlot(particleSpec, `Foo<div slotid="${innerSlotid}"></div>`);

    await innerSlotPromise;
  });

  it('release pending inner slot', async () => {
    let slotComposer = new SlotComposer(/* domRoot= */{}, /* pec= */ {});
    // require inner slot
    let innerSlotPromise = slotComposer.registerSlot(otherParticleSpec, innerSlotid);
    // release particle, while slot request is still pending.
    slotComposer.releaseSlot(otherParticleSpec);
    innerSlotPromise.then(function() {
      assert.fail('slot was released, promise should have been rejected.');
    }, function() {
    });
  });

  it('release inner slot', async () => {
    let slotComposer = new SlotComposer(/* domRoot= */{}, /* pec= */ {});
    // Register and render slot
    await slotComposer.registerSlot(particleSpec, rootSlotid, "view");
    slotComposer.renderSlot(particleSpec, `Foo<div slotid="${innerSlotid}"></div>`);
    // require inner slot
    await slotComposer.registerSlot(otherParticleSpec, innerSlotid);
    assert.equal(innerSlotid, slotComposer._getSlotId(otherParticleSpec));
    assert.equal(otherParticleSpec, slotComposer._getParticle(innerSlotid));

    // release root slot and verify inner slot was released too.
    slotComposer.releaseSlot(particleSpec);
    assert.equal(undefined, slotComposer._getSlotId(otherParticleSpec));
    assert.equal(undefined, slotComposer._getParticle(innerSlotid));
  });

  it('three-level-nested-slots', async () => {
    let slotComposer = new SlotComposer(/* domRoot= */{}, /* pec= */ {});
    // Register and render 3 inner slots
    await slotComposer.registerSlot(particleSpec, rootSlotid, "view");
    let rootContent = `Foo<div slotid="${innerSlotid}"></div>`;
    slotComposer.renderSlot(particleSpec, rootContent);
    await slotComposer.registerSlot(otherParticleSpec, innerSlotid, "view");
    let subInnerSlotid = "sub";
    let innerContent = `Bar<div slotid="${subInnerSlotid}"></div>`;
    slotComposer.renderSlot(otherParticleSpec, innerContent);
    let subParticleSpec = util.initParticleSpec("SubParticle");
    await slotComposer.registerSlot(subParticleSpec, subInnerSlotid, "view");
    let subInnerContent = "Bazzzz";
    slotComposer.renderSlot(subParticleSpec, subInnerContent);

    // Verify all 3 slots' content and mappings.
    let rootDom = slotComposer._getSlot(rootSlotid)._dom;
    assert.equal(rootContent, rootDom.innerHTML);
    let innerDom = slotComposer._getSlot(innerSlotid)._dom;
    assert.equal(innerContent, innerDom.innerHTML);
    assert.equal(subInnerContent, slotComposer._getSlot(subInnerSlotid)._dom.innerHTML);

    // release mid-layer slot.
    slotComposer.releaseSlot(otherParticleSpec);

    // Verify only root slot content remains
    assert.equal(rootContent, rootDom.innerHTML);
    assert.equal('', innerDom.innerHTML);
    assert.equal(undefined, slotComposer._getSlotId(subParticleSpec));
    assert.equal(undefined, slotComposer._getParticle(subInnerSlotid));
  });

  it('register and free slots', async () => {
   let slotComposer = new SlotComposer(/* domRoot= */{}, /* pec= */ {});
    // successfully register slot and inner slot.
    await slotComposer.registerSlot(particleSpec, rootSlotid, "view");
    slotComposer.renderSlot(particleSpec, `Foo<div slotid="${innerSlotid}"></div>`);
    await slotComposer.registerSlot(otherParticleSpec, innerSlotid);
    slotComposer.renderSlot(otherParticleSpec, 'Bar');

    // successfully release root slot.
    slotComposer.freeSlot(rootSlotid);
    assert.isTrue(slotComposer.hasSlot(rootSlotid));
    assert.equal(undefined, slotComposer._getSlotId(particleSpec));
    assert.equal(undefined, slotComposer._getParticle(rootSlotid));
    assert.isFalse(slotComposer.hasSlot(innerSlotid));
    assert.equal(undefined, slotComposer._getSlotId(otherParticleSpec));
    assert.equal(undefined, slotComposer._getParticle(innerSlotid));
  });
});
