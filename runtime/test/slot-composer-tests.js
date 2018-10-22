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

import {Arc} from '../ts-build/arc.js';
import {assert} from './chai-web.js';
import {SlotComposer} from '../slot-composer.js';
import {MockSlotDomConsumer} from '../testing/mock-slot-dom-consumer.js';
import {HostedSlotConsumer} from '../ts-build/hosted-slot-consumer.js';
import {Manifest} from '../ts-build/manifest.js';
import {Planner} from '../planner.js';
import {MessageChannel} from '../ts-build/message-channel.js';
import {ParticleExecutionContext} from '../particle-execution-context.js';
import {StubLoader} from '../testing/stub-loader.js';
import * as util from '../testing/test-util.js';
import {TestHelper} from '../testing/test-helper.js';

async function initSlotComposer(recipeStr) {
  const slotComposer = new SlotComposer({affordance: 'mock', rootContainer: {'root': 'dummy-container'}});

  const manifest = (await Manifest.parse(recipeStr));
  const loader = new StubLoader({
    '*': `defineParticle(({Particle}) => { return class P extends Particle {} });`
  });
  const pecFactory = function(id) {
    const channel = new MessageChannel();
    new ParticleExecutionContext(channel.port1, `${id}:inner`, loader);
    return channel.port2;
  };
  const arc = new Arc({
    id: 'test-plan-arc',
    context: manifest,
    pecFactory,
    slotComposer,
  });
  const startRenderParticles = [];
  arc.pec.startRender = ({particle, slotName, contentTypes}) => { startRenderParticles.push(particle.name); };
  const planner = new Planner();
  planner.init(arc);
  await planner.strategizer.generate();
  assert.lengthOf(planner.strategizer.population, 1);
  const plan = planner.strategizer.population[0].result;
  return {arc, slotComposer, plan, startRenderParticles};
}

describe('slot composer', function() {
  it('initialize recipe and render slots', async () => {
    const manifestStr = `
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
    assert.lengthOf(slotComposer.getAvailableContexts(), 1);

    const verifyContext = (name, expected) => {
      const context = slotComposer._contexts.find(c => c.name == name);
      assert.isNotNull(context);
      assert.equal(expected.sourceSlotName, context.sourceSlotConsumer ? context.sourceSlotConsumer.consumeConn.name : undefined);
      assert.equal(expected.hasContainer, Boolean(context.container));
      assert.deepEqual(expected.consumeConnNames || [], context.slotConsumers.map(slot => slot.consumeConn.getQualifiedName()));
    };
    verifyContext('root', {hasContainer: true});

    plan = plan.clone();

    // instantiate the recipe
    plan.normalize();
    assert.isTrue(plan.isResolved());
    assert.equal(arc.pec.slotComposer, slotComposer);
    await arc.instantiate(plan);
    assert.deepEqual(['A'], startRenderParticles);
    assert.lengthOf(slotComposer.getAvailableContexts(), 3);
    verifyContext('root', {hasContainer: true, consumeConnNames: ['A::root']});
    verifyContext('mySlot', {hasContainer: false, sourceSlotName: 'root', consumeConnNames: ['B::mySlot', 'BB::mySlot']});
    verifyContext('otherSlot', {hasContainer: false, sourceSlotName: 'root', consumeConnNames: ['C::otherSlot']});

    // render root slot
    const particle = arc.activeRecipe.particles[0];
    await slotComposer.renderSlot(particle, 'root', {model: {'foo': 'bar'}});
    const rootSlot = slotComposer.getSlotConsumer(particle, 'root');
    assert.deepEqual({foo: 'bar'}, rootSlot.getRendering().model);

    // update inner slots
    startRenderParticles.length = 0;
    rootSlot.getInnerContainer = (providedSlotName) => providedSlotName == 'mySlot' ? 'dummy-inner-container' : null;
    rootSlot.updateProvidedContexts();
    assert.deepEqual(['B', 'BB'], startRenderParticles);

    assert.lengthOf(slotComposer.getAvailableContexts(), 3);
    verifyContext('root', {hasContainer: true, consumeConnNames: ['A::root']});
    verifyContext('mySlot', {hasContainer: true, sourceSlotName: 'root', consumeConnNames: ['B::mySlot', 'BB::mySlot']});
    verifyContext('otherSlot', {hasContainer: false, sourceSlotName: 'root', consumeConnNames: ['C::otherSlot']});
  });

  it('initialize recipe and render hosted slots', async () => {
    const slotComposer = new SlotComposer({affordance: 'mock', rootContainer: {'root': 'dummy-container'}});
    const helper = await TestHelper.createAndPlan({
      manifestFilename: './runtime/test/particles/artifacts/products-test.recipes',
      slotComposer
    });

    const verifySlot = (fullName) => {
      const slot = slotComposer.consumers.find(s => fullName == s.consumeConn.getQualifiedName());
      assert.equal(MockSlotDomConsumer, slot.constructor);
      assert.isTrue(Boolean(slotComposer._contexts.find(context => context == slot.slotContext)));
    };
    const verifyHostedSlot = (fullName) => {
      const slot = slotComposer.consumers.find(s => fullName == s.consumeConn.getQualifiedName());
      assert.equal(HostedSlotConsumer, slot.constructor);
      assert.equal(MockSlotDomConsumer, slotComposer.consumers.find(s => s == slot.transformationSlotConsumer).constructor);
    };
    await helper.acceptSuggestion({particles: ['ItemMultiplexer', 'List', 'ProductFilter']});
    assert.lengthOf(slotComposer.consumers, 3);
    verifySlot('List::root');
    verifySlot('ItemMultiplexer::item');
    verifyHostedSlot('ShowProduct::item');
  });
});
