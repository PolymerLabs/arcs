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
import {InnerPEC} from '../inner-PEC.js';
import {Loader} from '../loader.js';
import {MockSlotComposer} from '../testing/mock-slot-composer.js';

describe('particle-shape-loading-with-slots', function() {
  async function instantiateRecipe() {
    let loader = new Loader();
    let pecFactory = function(id) {
      let channel = new MessageChannel();
      new InnerPEC(channel.port1, `${id}:inner`, loader);
      return channel.port2;
    };
    let slotComposer = new MockSlotComposer();
    let manifest = await Manifest.parse(`
      import './runtime/test/artifacts/transformations/test-slots-particles.manifest'

      recipe
        create as handle0
        slot 'slotid-0' as slot0
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
    let inHandle = handleFor(arc.findStoresByType(fooType.collectionOf())[0]);
    inHandle.store(new (fooType.entitySchema.entityClass())({value: 'foo1'}));
    inHandle.store(new (fooType.entitySchema.entityClass())({value: 'foo2'}));

    return {fooType, inHandle, slotComposer};
  }

  function verifyFooItems(items, expectedValues) {
    assert.equal(items.length, expectedValues.length);
    expectedValues.forEach(value => assert(items.find(item => item.value == value), `Cannot find item '${value}' in model`));
  }

  it('multiplex recipe with slots', async () => {
    let {fooType, inHandle, slotComposer} = await instantiateRecipe();
    slotComposer._slots[0].updateContext({});

    slotComposer
      .newExpectations()
      .expectRenderSlot('SingleSlotParticle', 'annotation', {contentTypes: ['template', 'model'], times: 2})
      .expectRenderSlot('MultiplexSlotsParticle', 'annotationsSet', {contentTypes: ['template', 'model']})
      .expectRenderSlot('MultiplexSlotsParticle', 'annotationsSet', {contentTypes: ['model'], times: 2, isOptional: true});
    await slotComposer.arc.pec.idle;
    await slotComposer.expectationsCompleted();

    // Verify slot template and models.
    assert.equal(1, slotComposer._slots.length);
    let slot = slotComposer._slots[0];
    assert.isTrue(slot._content.template.length > 0);
    verifyFooItems(slot._content.model.items, ['foo1', 'foo2']);

    // Add one more element.
    inHandle.store(new (fooType.entitySchema.entityClass())({value: 'foo3'}));
    slotComposer
      .newExpectations()
      .expectRenderSlot('SingleSlotParticle', 'annotation', {contentTypes: ['model']})
      .expectRenderSlot('MultiplexSlotsParticle', 'annotationsSet', {contentTypes: ['model']})
      .expectRenderSlot('MultiplexSlotsParticle', 'annotationsSet', {contentTypes: ['model'], times: 2, isOptional: true});
    await slotComposer.arc.pec.idle;
    await slotComposer.expectationsCompleted();

    // Verify slot template and models.
    assert.equal(1, slotComposer._slots.length);
    assert.isTrue(slot._content.template.length > 0);
    verifyFooItems(slot._content.model.items, ['foo1', 'foo2', 'foo3']);
  });

  it('multiplex recipe with slots (init context later)', async () => {
    // This test is different from the one above because it initializes the transformation particle context
    // after the hosted particles are also instantiated.
    // This verifies a different start-render call in slot-composer.
    let {fooType, inHandle, slotComposer} = await instantiateRecipe();
    // Wait for the hosted slots to be initialized in slot-composer.
    await new Promise((resolve, reject) => {
      let myInterval = setInterval(function() {
        if (slotComposer._slots[0]._hostedSlotById.size == 2) {
          resolve();
          clearInterval(myInterval);
        }
      }, 10);
    });
    slotComposer._slots[0].updateContext({});

    slotComposer
      .newExpectations()
      .expectRenderSlot('SingleSlotParticle', 'annotation', {contentTypes: ['template', 'model'], times: 2})
      .expectRenderSlot('MultiplexSlotsParticle', 'annotationsSet', {contentTypes: ['template', 'model']})
      .expectRenderSlot('MultiplexSlotsParticle', 'annotationsSet', {contentTypes: ['model'], times: 2, isOptional: true});
    await slotComposer.arc.pec.idle;
    await slotComposer.expectationsCompleted();

    // Verify slot template and models.
    assert.equal(1, slotComposer._slots.length);
    let slot = slotComposer._slots[0];
    assert.isTrue(slot._content.template.length > 0);
    verifyFooItems(slot._content.model.items, ['foo1', 'foo2']);

    // Add one more element.
    inHandle.store(new (fooType.entitySchema.entityClass())({value: 'foo3'}));

    slotComposer
      .newExpectations()
      .expectRenderSlot('SingleSlotParticle', 'annotation', {contentTypes: ['model']})
      .expectRenderSlot('MultiplexSlotsParticle', 'annotationsSet', {contentTypes: ['model']})
      .expectRenderSlot('MultiplexSlotsParticle', 'annotationsSet', {contentTypes: ['model'], times: 2, isOptional: true});
    await slotComposer.arc.pec.idle;
    await slotComposer.expectationsCompleted();

    // Verify slot template and models.
    assert.equal(1, slotComposer._slots.length);
    assert.isTrue(slot._content.template.length > 0);
    verifyFooItems(slot._content.model.items, ['foo1', 'foo2', 'foo3']);
  });
});
