/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import Manifest from '../manifest.js';
import {assert} from './chai-web.js';
import * as util from './test-util.js';
import handle from '../handle.js';
import Arc from "../arc.js";
import MessageChannel from "../message-channel.js";
import InnerPec from "../inner-PEC.js";
import Loader from "../loader.js";
import Recipe from "../recipe/recipe.js";
import Type from "../type.js";
import Shape from "../shape.js";
import ParticleSpec from "../particle-spec.js";
import MockSlotComposer from './mock-slot-composer.js';

describe('particle-shape-loading-with-slots', function() {
  async function instantiateRecipe() {
    var loader = new Loader();
    var pecFactory = function(id) {
      var channel = new MessageChannel();
      new InnerPec(channel.port1, `${id}:inner`, loader);
      return channel.port2;
    };
    var slotComposer = new MockSlotComposer();
    let manifest = await Manifest.parse(`
      import './particles/test/transformations/test-slots-particles.manifest'

      recipe
        create as view0
        slot 'slotid-0' as slot0
        MultiplexSlotsParticle
          particle = SingleSlotParticle
          foos <- view0
          consume annotationsSet as slot0
      `, {loader, fileName: './test.manifest'});
    let recipe = manifest.recipes[0];

    var arc = new Arc({id: 'test', pecFactory, slotComposer, context: manifest});

    assert(recipe.normalize(), "can't normalize recipe");
    assert(recipe.isResolved(), "recipe isn't resolved");

    await arc.instantiate(recipe);

    let fooType = manifest.findTypeByName('Foo');
    let inView = new handle.handleFor(arc.findViewsByType(fooType.setViewOf())[0]);
    inView.store(new (fooType.entitySchema.entityClass())({value: 'foo1'}));
    inView.store(new (fooType.entitySchema.entityClass())({value: 'foo2'}));

    return slotComposer;
  }

  function setRenderingExpectations(slotComposer) {
    slotComposer
      .newExpectations()
        // Inner arc instantiation for the first element.
        .expectRenderSlot("SingleSlotParticle", "annotation", ["template", "model"])
        .expectRenderSlot("MultiplexSlotsParticle", "annotationsSet", ["template", "model"])
        // Inner arc instantiation for the second element.
        .expectRenderSlot("SingleSlotParticle", "annotation", ["template", "model"])
        .expectRenderSlot("MultiplexSlotsParticle", "annotationsSet", ["template", "model"])
  }

  it('multiplex recipe with slots', async () => {
    let slotComposer = await instantiateRecipe();
    slotComposer._slots[0].updateContext({});

    setRenderingExpectations(slotComposer);

    await slotComposer.arc.pec.idle;
    await slotComposer.expectationsCompleted();

    // Verify slot template and models.
    assert.equal(1, slotComposer._slots.length);
    let slot = slotComposer._slots[0];
    assert.isTrue(slot._content.template.length > 0);
    assert.deepEqual([{subId: 'foo1', value: 'foo1'}, {subId: 'foo2', value: 'foo2'}], slot._content.model.items);
  });

  it('multiplex recipe with slots (init context later)', async () => {
    // This test is different from the one above because it initializes the transformation particle context
    // after the hosted particles are also instantiated.
    // This verifies a different start-render call in slot-composer.
    let slotComposer = await instantiateRecipe();

    // Wait for the hosted slots to be initialized in slot-composer.
    await new Promise((resolve, reject) => {
      var myInterval = setInterval(function() {
        if (slotComposer._slots[0]._hostedSlotById.size == 2) {
          resolve();
          clearInterval(myInterval);
        }
      }, 10);
    });
    slotComposer._slots[0].updateContext({});

    setRenderingExpectations(slotComposer);

    await slotComposer.arc.pec.idle;
    await slotComposer.expectationsCompleted();

    // Verify slot template and models.
    assert.equal(1, slotComposer._slots.length);
    let slot = slotComposer._slots[0];
    assert.isTrue(slot._content.template.length > 0);
    assert.deepEqual([{subId: 'foo1', value: 'foo1'}, {subId: 'foo2', value: 'foo2'}], slot._content.model.items);
  });
});
