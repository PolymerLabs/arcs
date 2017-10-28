/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

const Manifest = require('../manifest.js');
const assert = require('chai').assert;
const util = require('./test-util.js');
const viewlet = require('../viewlet.js');
const Arc = require("../arc.js");
const MessageChannel = require("../message-channel.js");
const InnerPec = require("../inner-PEC.js");
const Loader = require("../loader.js");
const Recipe = require("../recipe/recipe.js");
const Type = require("../type.js");
const Shape = require("../shape.js");
const ParticleSpec = require("../particle-spec.js");
const MockSlotComposer = require('./mock-slot-composer.js');

describe('particle-shape-loading-with-slots', function() {
  async function instantiateRecipe() {
    var loader = new Loader();

    var pecFactory = function(id) {
      var channel = new MessageChannel();
      new InnerPec(channel.port1, `${id}:inner`, loader);
      return channel.port2;
    };

    var slotComposer = new MockSlotComposer();
    // slotComposer._contextById["annotation"] = {'foo1': '', 'another-foo': ''};
    var arc = new Arc({id: 'test', pecFactory, slotComposer});

    let manifest = await Manifest.load('../particles/test/transformations/test-slots-particles.manifest', loader);

    let fooType = Type.newEntity(manifest.schemas.Foo);

    let recipe = new Recipe();
    let recipeParticle = recipe.newParticle("MultiplexSlotsParticle");
    assert.equal("MultiplexSlotsParticle", manifest.particles[1].name);

    let shape = new Shape([{type: fooType}], [{name: 'annotation'}]);
    let shapeType = Type.newShape(shape);
    let shapeView = arc.createView(shapeType);
    // TODO: Do we need to verify that particle matches the shape?
    shapeView.set(manifest.particles[0].toLiteral());

    // TODO: This is a hack, until particle parser support shape connection parsing.
    // Eventually should just use recipeParticle.spec = manifest.particles[1];
    recipeParticle.spec = new ParticleSpec({
      name: manifest.particles[1].name,
      implFile: manifest.particles[1].implFile,
      args: manifest.particles[1].connections.map(conn => { return { direction: conn.direction, type: conn.type, name: conn.name}; })
          .concat([{direction: 'host', type: shapeType, name: 'particle'}]),
      slots: [...manifest.particles[1].slots.values()].map(s => {
        return {
          name: s.name,
          isSet: s.isSet,
          providedSlots: s.providedSlots ? s.providedSlots.map(ps => { return {name: ps.name, isSet: ps.isSet, views: []}; }) : []
        };
      })
    }, a => a);

    let recipeShapeView = recipe.newView();
    recipeParticle.connections['particle'].connectToView(recipeShapeView);
    recipeShapeView.fate = 'use';
    recipeShapeView.mapToView(shapeView);

    let recipeInView = recipe.newView();
    recipeParticle.connections['foos'].connectToView(recipeInView);
    recipeInView.fate = 'use';

    let inView = arc.createView(fooType.viewOf());
    var Foo = manifest.schemas.Foo.entityClass();
    inView.store({id: 1, rawData: {value: 'foo1'} });
    inView.store({id: 2, rawData: {value: 'foo2'} });
    recipeInView.mapToView(inView);

    assert.equal(1, Object.keys(recipeParticle.consumedSlotConnections).length);
    let outerParticleSlotConnection = Object.values(recipeParticle.consumedSlotConnections)[0];
    let recipeSlot = recipe.newSlot(outerParticleSlotConnection.name);
    recipeSlot.id = 'myslot-id-0';
    outerParticleSlotConnection.connectToSlot(recipeSlot);

    assert(recipe.normalize(), "can't normalize recipe");
    assert(recipe.isResolved(), "recipe isn't resolved");

    arc.instantiate(recipe);

    return slotComposer;
  }

  function setRenderingExpectations(slotComposer) {
    slotComposer
      .newExpectations()
        .expectRenderSlot("MultiplexSlotsParticle", "annotationsSet", ["template", "model"])
        // Inner arc instantiation for the first element.
        .expectRenderSlot("SingleSlotParticle", "annotation", ["template", "model"])
        .expectRenderSlot("SingleSlotParticle", "annotation", ["model"])
        .expectRenderSlot("MultiplexSlotsParticle", "annotationsSet", ["template", "model"])
        .expectRenderSlot("MultiplexSlotsParticle", "annotationsSet", ["model"])
        .expectRenderSlot("SingleSlotParticle", "annotation", ["model"])
        .expectRenderSlot("MultiplexSlotsParticle", "annotationsSet", ["model"])
        // Inner arc instantiation for the second element.
        .expectRenderSlot("SingleSlotParticle", "annotation", ["template", "model"])
        .expectRenderSlot("SingleSlotParticle", "annotation", ["model"])
        .expectRenderSlot("MultiplexSlotsParticle", "annotationsSet", ["template", "model"])
        .expectRenderSlot("MultiplexSlotsParticle", "annotationsSet", ["model"])
        .expectRenderSlot("SingleSlotParticle", "annotation", ["model"])
        .expectRenderSlot("MultiplexSlotsParticle", "annotationsSet", ["model"]);
  }

  it('multiplex recipe with slots', async () => {
    let slotComposer = await instantiateRecipe();
    slotComposer._slots[0].setContext({});

    setRenderingExpectations(slotComposer);

    await slotComposer.arc.pec.idle;
    await slotComposer.expectationsCompleted();

    // Verify slot template and models.
    assert.equal(1, slotComposer._slots.length);
    let slot = slotComposer._slots[0];
    assert.isTrue(slot._content.template.length > 0);
    assert.deepEqual([{value: 'foo1'}, {value: 'foo2'}], slot._content.model);
  });

  it('multiplex recipe with slots (init context later)', async () => {
    // This test is different from the one above because it initializes the transformation particle context
    // after the hosted particles are also instantiated.
    // This verifies a different start-render call in slot-composer.
    let slotComposer = await instantiateRecipe();

    // Wait for the hosted slots to be initialized in slot-composer.
    await new Promise((resolve, reject) => {
      var myInterval = setInterval(function() {
        if (slotComposer._hostedSlotById.size == 2) {
          resolve();
          clearInterval(myInterval);
        }
      }, 10);
    });
    slotComposer._slots[0].setContext({});

    setRenderingExpectations(slotComposer);

    await slotComposer.arc.pec.idle;
    await slotComposer.expectationsCompleted();

    // Verify slot template and models.
    assert.equal(1, slotComposer._slots.length);
    let slot = slotComposer._slots[0];
    assert.isTrue(slot._content.template.length > 0);
    assert.deepEqual([{value: 'foo1'}, {value: 'foo2'}], slot._content.model);
  });
});
