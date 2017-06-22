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
var DomSlot = require("../dom-slot.js");
let util = require('./test-util.js');
let loader = new (require('../loader'));
const Bar = loader.loadEntity("Bar");
const view = require('../view.js');

describe('dom-slot', function() {
  it('initialize render derender and uninitialize', function() {
    let slot = new DomSlot('slotid');
    assert.isFalse(slot.isInitialized());
    assert.equal(undefined, slot.content);

    // initialize DOM.
    slot.initialize(/* context= */{}, /* exposedView= */undefined);
    assert.isTrue(slot.isInitialized());
    assert.equal(undefined, slot.content);

    // render content.
    let content = 'foo';
    assert.deepEqual([], slot.render(content, /* eventHandler= */undefined));
    assert.isTrue(slot.isInitialized());
    assert.equal(content, slot.dom._cachedContent);

    // render content with inner slots.
    content = 'foo<div slotid="action"></div>bar<div slotid="other"></div>';
    let innerSlotInfos = slot.render(content, /* eventHandler= */undefined);
    assert.equal(2, innerSlotInfos.length);
    assert.equal('action', innerSlotInfos[0].id);
    assert.equal('other', innerSlotInfos[1].id);
    assert.isTrue(slot.isInitialized());
    assert.equal(content, slot.dom._cachedContent);

    // derender content.
    slot.derender();
    assert.isTrue(slot.isInitialized());
    assert.equal('', slot.dom._cachedContent);

    // uninitialize DOM.
    slot.uninitialize();
    assert.isFalse(slot.isInitialized());
    assert.isNull(slot.dom);
  });

  it('check availability', function() {
    let slot = new DomSlot('slotid');
    // Slot isn't initialized.
    assert.isFalse(slot.isAvailable());

    // Slot is initialized and not associated with a Particle.
    slot.initialize(/* context= */{}, /* exposedView= */undefined);
    assert.isTrue(slot.isAvailable());

    // Slot is associated with a Particle.
    slot.associateWithParticle(util.initParticleSpec('particle'));
    assert.isFalse(slot.isAvailable());

	// Slot isn't initialized.
    slot.uninitialize();
    assert.isFalse(slot.isAvailable());
  });

  it('check exposed rendered views mapping', function() {
    let slot = new DomSlot('slotid');

    let v = new view.View(Bar.type, /* arc= */ null, "bar", "bar-id");
    // Slot is initialized and not associated with a Particle.
    slot.initialize(/* context= */{}, /* exposedView= */ v);
    assert.isTrue(slot.isAvailable());

    // Cannot associate particle with unmatching view with the Slot.
    let particle = util.initParticleSpec('particle');
    assert.throws(() => { slot.associateWithParticle(particle) });
    assert.isTrue(slot.isAvailable());

    // Successfully associate particle.
    particle.renderMap.set(slot.slotid, v);
    slot.associateWithParticle(particle)
    assert.isFalse(slot.isAvailable());
  });
});
