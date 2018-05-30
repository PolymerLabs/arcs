/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {assert} from '../../runtime/test/chai-web.js';

import {Arc} from '../../runtime/arc.js';
import {DomSlot} from '../../runtime/dom-slot.js';
import {Loader} from '../../runtime/loader.js';
import {Manifest} from '../../runtime/manifest.js';
import {MockDomSlot, MockDomContext} from '../../runtime/testing/mock-dom-slot.js';
import {SlotComposer} from '../../runtime/slot-composer.js';
import {TestHelper} from '../../runtime/testing/test-helper.js';

let loader = new Loader();

describe('Multiplexer', function() {
  it('Processes multiple inputs', async () => {
    let manifest = await Manifest.parse(`
      import 'shell/artifacts/Common/Multiplexer.manifest'
      import 'runtime/test/artifacts/test-particles.manifest'
      
      recipe
        slot 'slotid' as slot0
        use 'test:1' as handle0
        Multiplexer
          hostedParticle = ConsumerParticle
          consume annotation as slot0
          list <- handle0

    `, {loader, fileName: './manifest.manifest'});

    let recipe = manifest.recipes[0];

    let barType = manifest.findTypeByName('Bar');

    let slotComposer = new SlotComposer({affordance: 'mock', rootContext: 'slotid'});

    let slotComposer_createHostedSlot = slotComposer.createHostedSlot;

    let slotsCreated = 0;

    slotComposer.createHostedSlot = (a, b, c, d) => {
      slotsCreated++;
      return slotComposer_createHostedSlot.apply(slotComposer, [a, b, c, d]);
    };

    let arc = new Arc({id: 'test', context: manifest, slotComposer});
    let barStore = await arc.createStore(barType.collectionOf(), null, 'test:1');
    recipe.handles[0].mapToStorage(barStore);
    assert(recipe.normalize());
    assert(recipe.isResolved());

    await arc.instantiate(recipe);

    await arc.idle;

    await barStore.store({id: 'a', rawData: {value: 'one'}});
    await barStore.store({id: 'b', rawData: {value: 'two'}});
    await barStore.store({id: 'c', rawData: {value: 'three'}});

    await arc.idle;

    assert.equal(slotsCreated, 3);
  });

  it('renders polymorphic multiplexed slots', async function() {
    let helper = new TestHelper();
    await helper.loadManifest('./runtime/test/particles/artifacts/polymorphic-muxing.recipes');
    let context = helper.arc._context;

    let showOneParticle = context.particles.find(p => p.name == 'ShowOne');
    let showTwoParticle = context.particles.find(p => p.name == 'ShowTwo');
    let showOneSpec = JSON.stringify(showOneParticle.toLiteral());
    let showTwoSpec = JSON.stringify(showTwoParticle.toLiteral());
    let postsStore = context.stores[0];
    let recipeOne = `${showOneParticle.toString()}\nrecipe\n  use '{{item_id}}' as v1\n  slot '{{slot_id}}' as s1\n  ShowOne\n    post <- v1\n    consume item as s1`;
    let recipeTwo = `${showTwoParticle.toString()}\nrecipe\n  use '{{item_id}}' as v1\n  slot '{{slot_id}}' as s1\n  ShowTwo\n    post <- v1\n    consume item as s1`;
    await postsStore.store({id: '1', rawData: {message: 'x', renderRecipe: recipeOne, renderParticleSpec: showOneSpec}});
    await postsStore.store({id: '2', rawData: {message: 'y', renderRecipe: recipeTwo, renderParticleSpec: showTwoSpec}});
    await postsStore.store({id: '3', rawData: {message: 'z', renderRecipe: recipeOne, renderParticleSpec: showOneSpec}});
    await helper.makePlans();

    // Render 3 posts
    helper.slotComposer
        .newExpectations()
        .expectRenderSlot('List', 'root', {contentTypes: ['template', 'model']})
        .expectRenderSlot('PostMuxer', 'item', {contentTypes: ['template', 'templateName', 'model']})
        .expectRenderSlot('PostMuxer', 'item', {contentTypes: ['template', 'templateName', 'model'], times: 2, isOptional: true})
        .expectRenderSlot('ShowOne', 'item', {contentTypes: ['template', 'templateName', 'model'], times: 2})
        .expectRenderSlot('ShowTwo', 'item', {contentTypes: ['template', 'templateName', 'model']});
    await helper.acceptSuggestion({particles: ['PostMuxer', 'List']});

    // Add and render one more post
    helper.slotComposer
        .newExpectations()
        .expectRenderSlot('List', 'root', {contentTypes: ['templateName', 'model']})
        .expectRenderSlot('PostMuxer', 'item', {contentTypes: ['templateName', 'model']})
        .expectRenderSlot('ShowOne', 'item', {contentTypes: ['templateName', 'model']})
        .expectRenderSlot('PostMuxer', 'item', {contentTypes: ['templateName', 'model']});
    await postsStore.store({id: '4', rawData: {message: 'w', renderRecipe: recipeOne, renderParticleSpec: showOneSpec}});
    await helper.idle();
    assert.lengthOf(helper.slotComposer._slots, 2);
    let itemSlot = helper.slotComposer._slots.find(s => s.consumeConn.name == 'item');
    assert(itemSlot);

    // verify hosted slots
    assert.equal(4, itemSlot._hostedSlotById.size);

    // verify model
    assert.lengthOf(itemSlot._model.items, 4);
    [{subId: '1', message: 'x'}, {subId: '2', message: 'y'}, {subId: '3', message: 'z'}, {subId: '4', message: 'w'}].forEach(expected => {
        assert(itemSlot._model.items.find(item => item.subId == expected.subId && item.message == expected.message),
              `Cannot find item {subId: '${expected.subId}', message: '${expected.message}'`);
    });

    // verify context
    let itemContext = itemSlot._context;
    assert.deepEqual(['1', '2', '3', '4'], Object.keys(itemContext._contextBySubId).sort());
    Object.values(itemContext._contextBySubId).forEach(context => {
      if (context._subId == '2') {
        assert.equal('PostMuxer::item::ShowTwo::item::default', context._templateName);
      } else {
        assert.equal('PostMuxer::item::ShowOne::item::default', context._templateName);
      }
    });

    // verify template cache
    MockDomContext.hasTemplate('PostMuxer::item::ShowOne::item::default');
    MockDomContext.hasTemplate('PostMuxer::item::ShowTwo::item::default');
    MockDomContext.hasTemplate('PostMuxer::item::default');
    MockDomContext.hasTemplate('Root  ::item::ShowOne::item::default');
  });
});
