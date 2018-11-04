/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {Manifest} from '../ts-build/manifest.js';
import {assert} from './chai-web.js';
import * as util from '../testing/test-util.js';
import {Arc} from '../ts-build/arc.js';
import {MessageChannel} from '../ts-build/message-channel.js';
import {ParticleExecutionContext} from '../ts-build/particle-execution-context.js';
import {Loader} from '../ts-build/loader.js';
import {MockSlotComposer} from '../testing/mock-slot-composer.js';
import {SlotDomConsumer} from '../ts-build/slot-dom-consumer.js';
import {MockSlotDomConsumer} from '../testing/mock-slot-dom-consumer.js';
import {HostedSlotConsumer} from '../ts-build/hosted-slot-consumer.js';

describe('particle-shape-loading-with-slots', function() {
  async function initializeManifestAndArc(contextContainer) {
    const loader = new Loader();
    const pecFactory = function(id) {
      const channel = new MessageChannel();
      new ParticleExecutionContext(channel.port1, `${id}:inner`, loader);
      return channel.port2;
    };
    const slotComposer = new MockSlotComposer({rootContainer: {'set-slotid-0': contextContainer || {}}});
    slotComposer._contexts[0].spec.isSet = true; // MultiplexSlotsParticle expects a Set Slot root.
    const manifest = await Manifest.parse(`
      import './runtime/test/artifacts/transformations/test-slots-particles.manifest'

      recipe
        create as handle0
        slot 'rootslotid-set-slotid-0' as slot0
        MultiplexSlotsParticle
          particle = SingleSlotParticle
          foos <- handle0
          consume annotationsSet as slot0
      `, {loader, fileName: './test.manifest'});
    const recipe = manifest.recipes[0];

    const arc = new Arc({id: 'test', pecFactory, slotComposer, context: manifest});

    assert(recipe.normalize(), 'can\'t normalize recipe');
    assert(recipe.isResolved(), 'recipe isn\'t resolved');

    return {manifest, recipe, slotComposer, arc};
  }
  async function instantiateRecipeAndStore(arc, recipe, manifest) {
    await arc.instantiate(recipe);
    const inStore = arc.findStoresByType(manifest.findTypeByName('Foo').collectionOf())[0];
    await inStore.store({id: 'subid-1', rawData: {value: 'foo1'}}, ['key1']);
    await inStore.store({id: 'subid-2', rawData: {value: 'foo2'}}, ['key2']);
    return inStore;
  }

  const expectedTemplateName = 'MultiplexSlotsParticle::annotationsSet::SingleSlotParticle::annotation::default';

  function verifyFooItems(slotConsumer, expectedValues) {
    const renderings = slotConsumer.renderings.filter(([subId, {model}]) => Boolean(model));
    assert.equal(renderings.length, Object.keys(expectedValues).length);
    for (const [subId, {model, templateName}] of renderings) {
      assert.equal(expectedValues[subId], model.value);
      assert.equal(expectedTemplateName, templateName);
      assert.isTrue(!!SlotDomConsumer.hasTemplate(expectedTemplateName));
    }
  }

  it('multiplex recipe with slots - immediate', async () => {
    const {manifest, recipe, slotComposer, arc} = await initializeManifestAndArc({
      'subid-1': 'dummy-container1', 'subid-2': 'dummy-container2', 'subid-3': 'dummy-container3'
    });

    slotComposer
      .newExpectations()
      .expectRenderSlot('SingleSlotParticle', 'annotation', {contentTypes: ['template', 'model'], times: 2})
      .expectRenderSlot('MultiplexSlotsParticle', 'annotationsSet', {contentTypes: ['template', 'model']})
      .expectRenderSlot('MultiplexSlotsParticle', 'annotationsSet', {contentTypes: ['model'], times: 2, isOptional: true});

    const inStore = await instantiateRecipeAndStore(arc, recipe, manifest);
    await slotComposer.arc.pec.idle;
    await slotComposer.expectationsCompleted();

    // Verify slot template and models.
    assert.lengthOf(slotComposer.consumers, 3);
    assert.isTrue(slotComposer.consumers[0] instanceof SlotDomConsumer);
    assert.isTrue(slotComposer.consumers[1] instanceof HostedSlotConsumer);
    assert.isTrue(slotComposer.consumers[2] instanceof HostedSlotConsumer);
    const slot = slotComposer.consumers[0];
    verifyFooItems(slot, {'subid-1': 'foo1', 'subid-2': 'foo2'});

    // Add one more element.
    await inStore.store({id: 'subid-3', rawData: {value: 'foo3'}}, ['key3']);
    slotComposer
      .newExpectations()
      .expectRenderSlot('SingleSlotParticle', 'annotation', {contentTypes: ['model']})
      .expectRenderSlot('MultiplexSlotsParticle', 'annotationsSet', {contentTypes: ['model']})
      .expectRenderSlot('MultiplexSlotsParticle', 'annotationsSet', {contentTypes: ['model'], times: 2, isOptional: true});
    await slotComposer.arc.pec.idle;
    await slotComposer.expectationsCompleted();

    verifyFooItems(slot, {'subid-1': 'foo1', 'subid-2': 'foo2', 'subid-3': 'foo3'});
  });

  it('multiplex recipe with slots - init context later', async () => {
    // This test is different from the one above because it initializes the transformation particle context
    // after the hosted particles are also instantiated.
    // This verifies a different start-render call in slot-composer.
    const {manifest, recipe, slotComposer, arc} = await initializeManifestAndArc();
    slotComposer._contexts[0]._container = null;
    const inStore = await instantiateRecipeAndStore(arc, recipe, manifest);

    // Wait for the hosted slots to be initialized in slot-composer.
    await new Promise((resolve, reject) => {
      const myInterval = setInterval(function() {
        if (slotComposer.consumers.length == 3) { // last 2 are hosted slots
          resolve();
          clearInterval(myInterval);
        }
      }, 10);
    });

    slotComposer
      .newExpectations()
      .expectRenderSlot('SingleSlotParticle', 'annotation', {contentTypes: ['template', 'model'], times: 2})
      .expectRenderSlot('MultiplexSlotsParticle', 'annotationsSet', {contentTypes: ['template', 'model']})
      .expectRenderSlot('MultiplexSlotsParticle', 'annotationsSet', {contentTypes: ['model'], times: 2, isOptional: true});

    slotComposer._contexts[0].container = {'subid-1': 'dummy-container1', 'subid-2': 'dummy-container2', 'subid-3': 'dummy-container3'};
    slotComposer.consumers[0].onContainerUpdate({});

    await slotComposer.arc.pec.idle;
    await slotComposer.expectationsCompleted();

    // Verify slot template and models.
    assert.lengthOf(slotComposer.consumers, 3);
    const slot = slotComposer.consumers[0];
    verifyFooItems(slot, {'subid-1': 'foo1', 'subid-2': 'foo2'});

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
    verifyFooItems(slot, {'subid-1': 'foo1', 'subid-2': 'foo2', 'subid-3': 'foo3'});
  });
});
