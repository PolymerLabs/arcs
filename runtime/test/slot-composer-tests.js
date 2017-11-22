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

import Arc from '../arc.js';
import {assert} from './chai-web.js';
import Slot from "../slot.js";
import SlotComposer from "../slot-composer.js";
import Manifest from '../manifest.js';
import Planner from '../planner.js';
import * as util from './test-util.js';

class MockSlot extends Slot {
  constructor(consumeConn, arc) {
    super(consumeConn, arc);
    this.content = null;
  }
  setContent(content, handler) {
    this.content = content;
  }
}

async function initSlotComposer(recipeStr) {
  var slotComposer = new SlotComposer({affordance: 'mock', rootContext: 'dummy-context'});
  slotComposer._slotClass = MockSlot;

  let manifest = (await Manifest.parse(recipeStr));
  var arc = new Arc({
    id: "test-plan-arc",
    context: manifest,
    slotComposer,
  });
  let startRenderParticles = [];
  arc.pec.startRender = ({particle, slotName, contentTypes}) => { startRenderParticles.push(particle.name); };
  var planner = new Planner();
  planner.init(arc);
  await planner.generate();
  assert.equal(planner.strategizer.population.length, 1);
  var plan = planner.strategizer.population[0].result;
  return {arc, slotComposer, plan, startRenderParticles};
}

describe('slot composer', function() {
  it('initialize recipe and render slots', async () => {
    let manifestStr = `
particle A in 'a.js'
  A()
  consume root
    provide mySlot
    provide otherSlot
particle B in 'b.js'
  B()
  consume mySlot
particle BB in 'bb.js'
  BB()
  consume mySlot
particle C in 'c.js'
  C()
  consume otherSlot
recipe
  slot 'root' as slot0
  A
    consume root as slot0
      provide mySlot as slot1
      provide otherSlot as slot2
  B
    consume mySlot as slot1
  BB
    consume mySlot as slot1
  C
    consume otherSlot as slot2
        `;
    let {arc, slotComposer, plan, startRenderParticles} = await initSlotComposer(manifestStr);
    plan = plan.clone();

    // "root" slot is always available
    assert.deepEqual(["root"], Object.keys(slotComposer.getAvailableSlots()));

    // initializing recipe
    slotComposer.initializeRecipe(plan.particles);
    assert.deepEqual(['A'], startRenderParticles);

    // render root slot
    debugger;
    let particle = plan.particles[0];
    slotComposer.renderSlot(particle, 'root', 'dummy-content');
    let rootSlot = slotComposer.getSlot(particle, 'root');
    assert.equal('dummy-content', rootSlot.content);

    // update inner slots
    startRenderParticles.length = 0;
    rootSlot.getInnerContext = (providedSlotName) => providedSlotName == 'mySlot' ? 'dummy-inner-context' : null;
    slotComposer.updateInnerSlots(rootSlot);
    assert.deepEqual(['B', 'BB'], startRenderParticles);

    // get available slots
    // TODO: slot composer should actually return only "mySlot" and "root" - the slots that were actually rendered,
    // however because in the browser demo, the planner is executed before the slots are really rendered, all the
    // slots that could possibly be rendered are returned.
    assert.deepEqual(["mySlot", "otherSlot", "root"], Object.keys(slotComposer.getAvailableSlots()));
  });
});
