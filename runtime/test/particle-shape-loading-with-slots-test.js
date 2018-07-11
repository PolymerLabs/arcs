/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {Manifest} from '../manifest.js';
import {assert} from './chai-web.js';
import * as util from '../testing/test-util.js';
import {handleFor} from '../handle.js';
import {Arc} from '../arc.js';
import {MessageChannel} from '../message-channel.js';
import {ParticleExecutionContext} from '../particle-execution-context.js';
import {Loader} from '../loader.js';
import {MockSlotComposer} from '../testing/mock-slot-composer.js';
import {Slot} from '../slot.js';
import {SlotDomRenderer} from '../slot/slot-dom-renderer.js';
import {HostedSlotConsumer} from '../slot/hosted-slot-consumer.js';

describe('particle-shape-loading-with-slots', function() {
  async function instantiateRecipe(contextContainer) {
    let loader = new Loader();
    let pecFactory = function(id) {
      let channel = new MessageChannel();
      new ParticleExecutionContext(channel.port1, `${id}:inner`, loader);
      return channel.port2;
    };
    let slotComposer = new MockSlotComposer({rootContainer: {'set-slotid-0': contextContainer || {}}});
    let manifest = await Manifest.parse(`
      import './runtime/test/artifacts/transformations/test-slots-particles.manifest'

      recipe
        create as handle0
        slot 'rootslotid-set-slotid-0' as slot0
        MultiplexSlotsParticle
          particle = SingleSlotParticle
          foos <- handle0
          consume annotationsSet as slot0
      `, {loader, fileName: './test.manifest'});
    let recipe = manifest.recipes[0];

    let arc = new Arc({id: 'test', pecFactory, slotComposer, context: manifest});

    assert(recipe.normalize(), 'can\'t normalize recipe');
    assert(recipe.isResolved(), 'recipe isn\'t resolved');

    await arc.instantiate(recipe);

    let fooType = manifest.findTypeByName('Foo');
    let inStore = arc.findStoresByType(fooType.collectionOf())[0];
    return {inStore, slotComposer};
  }

  let expectedTemplateName = 'MultiplexSlotsParticle::annotationsSet::SingleSlotParticle::annotation::default';

  function verifyFooItems(renderer, expectedValues) {
    let infos = renderer.infos.filter(([subId, {model}]) => Boolean(model));
    assert.equal(infos.length, Object.keys(expectedValues).length);
    for (let [subId, {model, templateName}] of infos) {
      assert.equal(expectedValues[subId], model.value);
      assert.equal(expectedTemplateName, templateName);
      assert.isTrue(!!SlotDomRenderer.hasTemplate(expectedTemplateName));
    }
  }

  it('multiplex recipe with slots', async () => {
    let {inStore, slotComposer} = await instantiateRecipe({
      'subid-1': 'dummy-container1', 'subid-2': 'dummy-container2', 'subid-3': 'dummy-container3'
    });
    await inStore.store({id: 'subid-1', rawData: {value: 'foo1'}}, ['key1']);
    await inStore.store({id: 'subid-2', rawData: {value: 'foo2'}}, ['key2']);

    slotComposer
      .newExpectations()
      .expectRenderSlot('SingleSlotParticle', 'annotation', {contentTypes: ['template', 'model'], times: 2})
      .expectRenderSlot('MultiplexSlotsParticle', 'annotationsSet', {contentTypes: ['template', 'model']})
      .expectRenderSlot('MultiplexSlotsParticle', 'annotationsSet', {contentTypes: ['model'], times: 2, isOptional: true});
    await slotComposer.arc.pec.idle;
    await slotComposer.expectationsCompleted();

    // Verify slot template and models.
    assert.lengthOf(slotComposer._slots, 3);
    assert.isTrue(slotComposer._slots[0] instanceof Slot);
    assert.isTrue(slotComposer._slots[1] instanceof HostedSlotConsumer);
    assert.isTrue(slotComposer._slots[2] instanceof HostedSlotConsumer);
    let slot = slotComposer._slots[0];
    verifyFooItems(slot.renderer, {'subid-1': 'foo1', 'subid-2': 'foo2'});

    // Add one more element.
    await inStore.store({id: 'subid-3', rawData: {value: 'foo3'}}, ['key3']);
    slotComposer
      .newExpectations()
      .expectRenderSlot('SingleSlotParticle', 'annotation', {contentTypes: ['model']})
      .expectRenderSlot('MultiplexSlotsParticle', 'annotationsSet', {contentTypes: ['model']})
      .expectRenderSlot('MultiplexSlotsParticle', 'annotationsSet', {contentTypes: ['model'], times: 2, isOptional: true});
    await slotComposer.arc.pec.idle;
    await slotComposer.expectationsCompleted();

    verifyFooItems(slot.renderer, {'subid-1': 'foo1', 'subid-2': 'foo2', 'subid-3': 'foo3'});
  });

  it('multiplex recipe with slots (init context later)', async () => {
    // This test is different from the one above because it initializes the transformation particle context
    // after the hosted particles are also instantiated.
    // This verifies a different start-render call in slot-composer.
    let {inStore, slotComposer} = await instantiateRecipe();
    slotComposer._contexts[0]._container = null;
    await inStore.store({id: 'subid-1', rawData: {value: 'foo1'}}, ['key1']);
    await inStore.store({id: 'subid-2', rawData: {value: 'foo2'}}, ['key2']);

    // Wait for the hosted slots to be initialized in slot-composer.
    await new Promise((resolve, reject) => {
      let myInterval = setInterval(function() {
        if (slotComposer._slots.length == 3) { // last 2 are hosted slots
          resolve();
          clearInterval(myInterval);
        }
      }, 10);
    });
    slotComposer._contexts[0].container = {'subid-1': 'dummy-container1', 'subid-2': 'dummy-container2', 'subid-3': 'dummy-container3'};

    slotComposer
      .newExpectations()
      .expectRenderSlot('SingleSlotParticle', 'annotation', {contentTypes: ['template', 'model'], times: 2})
      .expectRenderSlot('MultiplexSlotsParticle', 'annotationsSet', {contentTypes: ['template', 'model']})
      .expectRenderSlot('MultiplexSlotsParticle', 'annotationsSet', {contentTypes: ['model'], times: 2, isOptional: true});
    slotComposer._slots[0].onContainerUpdate({});
    await slotComposer.arc.pec.idle;
    await slotComposer.expectationsCompleted();

    // Verify slot template and models.
    assert.lengthOf(slotComposer._slots, 3);
    let slot = slotComposer._slots[0];
    verifyFooItems(slot.renderer, {'subid-1': 'foo1', 'subid-2': 'foo2'});

    // Add one more element.
    inStore.store({id: 'subid-3', rawData: {value: 'foo3'}}, ['key3']);
    slotComposer
      .newExpectations()
      .expectRenderSlot('SingleSlotParticle', 'annotation', {contentTypes: ['model']})
      .expectRenderSlot('MultiplexSlotsParticle', 'annotationsSet', {contentTypes: ['model']})
      .expectRenderSlot('MultiplexSlotsParticle', 'annotationsSet', {contentTypes: ['model'], times: 2, isOptional: true});
    await slotComposer.arc.pec.idle;
    await slotComposer.expectationsCompleted();

    // Verify slot template and models.
    verifyFooItems(slot.renderer, {'subid-1': 'foo1', 'subid-2': 'foo2', 'subid-3': 'foo3'});
  });
});
