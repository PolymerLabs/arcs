/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {assert} from '../test/chai-web.js';

import {Arc} from '../ts-build/arc.js';
import {Loader} from '../ts-build/loader.js';
import {Manifest} from '../manifest.js';
import {SlotConsumer} from '../ts-build/slot-consumer.js';
import {SlotComposer} from '../slot-composer.js';
import {SlotDomConsumer} from '../ts-build/slot-dom-consumer.js';
import {MockSlotDomConsumer} from '../testing/mock-slot-dom-consumer.js';
import {HostedSlotConsumer} from '../ts-build/hosted-slot-consumer.js';
import {TestHelper} from '../testing/test-helper.js';

let loader = new Loader();

describe('Multiplexer', function() {
  it('Processes multiple inputs', async () => {
    let manifest = await Manifest.parse(`
      import 'runtime/test/artifacts/Common/Multiplexer.manifest'
      import 'runtime/test/artifacts/test-particles.manifest'

      recipe
        slot 'rootslotid-slotid' as slot0
        use 'test:1' as handle0
        Multiplexer
          hostedParticle = ConsumerParticle
          consume annotation as slot0
          list <- handle0

    `, {loader, fileName: './manifest.manifest'});

    let recipe = manifest.recipes[0];

    let barType = manifest.findTypeByName('Bar');

    let slotComposer = new SlotComposer({affordance: 'mock', rootContainer: {'slotid': 'dummy-container'}});

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

    await barStore.store({id: 'a', rawData: {value: 'one'}}, ['key1']);
    await barStore.store({id: 'b', rawData: {value: 'two'}}, ['key2']);
    await barStore.store({id: 'c', rawData: {value: 'three'}}, ['key3']);

    await arc.idle;

    assert.equal(slotsCreated, 3);
  });

  it('renders polymorphic multiplexed slots', async function() {
    let helper = await TestHelper.create({
      manifestFilename: './runtime/test/particles/artifacts/polymorphic-muxing.recipes'
    });
    let context = helper.arc._context;

    let showOneParticle = context.particles.find(p => p.name == 'ShowOne');
    let showTwoParticle = context.particles.find(p => p.name == 'ShowTwo');
    let showOneSpec = JSON.stringify(showOneParticle.toLiteral());
    let showTwoSpec = JSON.stringify(showTwoParticle.toLiteral());
    let postsStore = context.stores[0];
    let recipeOne = `${showOneParticle.toString()}\nrecipe\n  use '{{item_id}}' as v1\n  slot '{{slot_id}}' as s1\n  ShowOne\n    post <- v1\n    consume item as s1`;
    let recipeTwo = `${showTwoParticle.toString()}\nrecipe\n  use '{{item_id}}' as v1\n  slot '{{slot_id}}' as s1\n  ShowTwo\n    post <- v1\n    consume item as s1`;
    await postsStore.store({id: '1', rawData: {message: 'x', renderRecipe: recipeOne, renderParticleSpec: showOneSpec}}, ['key1']);
    await postsStore.store({id: '2', rawData: {message: 'y', renderRecipe: recipeTwo, renderParticleSpec: showTwoSpec}}, ['key2']);
    await postsStore.store({id: '3', rawData: {message: 'z', renderRecipe: recipeOne, renderParticleSpec: showOneSpec}}, ['key3']);
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
    await postsStore.store({id: '4', rawData: {message: 'w', renderRecipe: recipeOne, renderParticleSpec: showOneSpec}}, ['key1']);
    await helper.idle();
    assert.lengthOf(helper.slotComposer.consumers.filter(s => s.constructor === MockSlotDomConsumer), 2);
    assert.lengthOf(helper.slotComposer.consumers.filter(s => s.constructor === HostedSlotConsumer), 4);
    let itemSlot = helper.slotComposer.consumers.find(s => s.consumeConn.name == 'item');
    assert(itemSlot);
    let items = itemSlot.renderings.map(([subId, item]) => item);

    // verify model
    assert.lengthOf(items, 4);
    [{subId: '1', message: 'x'}, {subId: '2', message: 'y'}, {subId: '3', message: 'z'}, {subId: '4', message: 'w'}].forEach(expected => {
        assert(items.find(item => item.model.subId == expected.subId && item.model.message == expected.message),
              `Cannot find item {subId: '${expected.subId}', message: '${expected.message}'`);
    });

    // verify template names
    for (let item of items) {
      if (item.model.subId == '2') {
        assert.equal('PostMuxer::item::ShowTwo::item::default', item.templateName);
      } else {
        assert.equal('PostMuxer::item::ShowOne::item::default', item.templateName);
      }
    }

    // verify template cache
    SlotDomConsumer.hasTemplate('PostMuxer::item::ShowOne::item::default');
    SlotDomConsumer.hasTemplate('PostMuxer::item::ShowTwo::item::default');
    SlotDomConsumer.hasTemplate('PostMuxer::item::default');
    SlotDomConsumer.hasTemplate('Root::item::ShowOne::item::default');
  });
});
