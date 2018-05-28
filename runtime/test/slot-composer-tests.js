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

import {Arc} from '../arc.js';
import {assert} from './chai-web.js';
import {Slot} from '../slot.js';
import {SlotComposer} from '../slot-composer.js';
import {Manifest} from '../manifest.js';
import {Planner} from '../planner.js';
import {MessageChannel} from '../message-channel.js';
import {InnerPEC} from '../inner-PEC.js';
import {StubLoader} from '../testing/stub-loader.js';
import * as util from '../testing/test-util.js';

class MockSlot extends Slot {
  constructor(consumeConn, arc) {
    super(consumeConn, arc);
    this.content = null;
  }
  setContent(content, handler) {
    this.content = content;
  }
}

class MockContext {
  constructor(context) {
    this.context = context;
  }
  isEqual(other) {
    return this.context == other.context;
  }
}

async function initSlotComposer(recipeStr) {
  let slotComposer = new SlotComposer({affordance: 'mock', rootContext: new MockContext('dummy-context')});
  slotComposer._affordance._slotClass = MockSlot;

  let manifest = (await Manifest.parse(recipeStr));
  let loader = new StubLoader({
    '*': `defineParticle(({Particle}) => { return class P extends Particle {} });`
  });
  const pecFactory = function(id) {
    const channel = new MessageChannel();
    new InnerPEC(channel.port1, `${id}:inner`, loader);
    return channel.port2;
  };
  let arc = new Arc({
    id: 'test-plan-arc',
    context: manifest,
    pecFactory,
    slotComposer,
  });
  let startRenderParticles = [];
  arc.pec.startRender = ({particle, slotName, contentTypes}) => { startRenderParticles.push(particle.name); };
  let planner = new Planner();
  planner.init(arc);
  await planner.strategizer.generate();
  assert.equal(planner.strategizer.population.length, 1);
  let plan = planner.strategizer.population[0].result;
  return {arc, slotComposer, plan, startRenderParticles};
}

describe('slot composer', function() {
  it('initialize recipe and render slots', async () => {
    let manifestStr = `
particle A in 'a.js'
  consume root
    provide mySlot
    provide otherSlot
particle B in 'b.js'
  consume mySlot
particle BB in 'bb.js'
  consume mySlot
particle C in 'c.js'
  consume otherSlot
recipe
  slot 'rootslotid-root' as slot0
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
    assert.deepEqual(['root'], slotComposer.getAvailableSlots().map(s => s.name));

    // instantiate the recipe
    plan.normalize();
    assert.isTrue(plan.isResolved());
    assert.equal(arc.pec.slotComposer, slotComposer);
    await arc.instantiate(plan);
    assert.deepEqual(['A'], startRenderParticles);

    // render root slot
    let particle = arc.activeRecipe.particles[0];
    slotComposer.renderSlot(particle, 'root', 'dummy-content');
    let rootSlot = slotComposer.getSlot(particle, 'root');
    assert.equal('dummy-content', rootSlot.content);

    // update inner slots
    startRenderParticles.length = 0;
    rootSlot.getInnerContext = (providedSlotName) => providedSlotName == 'mySlot' ? 'dummy-inner-context' : null;
    await slotComposer.updateInnerSlots(rootSlot);
    assert.deepEqual(['B', 'BB'], startRenderParticles);

    assert.deepEqual(['mySlot', 'otherSlot', 'root'], slotComposer.getAvailableSlots().map(s => s.name));
  });
});
