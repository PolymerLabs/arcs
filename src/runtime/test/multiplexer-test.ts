/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {assert} from '../../platform/chai-web.js';
import {Arc} from '../arc.js';
import {Loader} from '../loader.js';
import {HostedSlotContext} from '../slot-context.js';
import {SlotDomConsumer} from '../slot-dom-consumer.js';
import {CollectionStorageProvider} from '../storage/storage-provider-base.js';
import {FakeSlotComposer} from '../testing/fake-slot-composer.js';
import {TestHelper} from '../testing/test-helper.js';

describe('Multiplexer', () => {
  it('Processes multiple inputs', async () => {
    const manifest = await TestHelper.parseManifest(`
      import 'src/runtime/test/artifacts/Common/Multiplexer.manifest'
      import 'src/runtime/test/artifacts/test-particles.manifest'

      recipe
        slot 'rootslotid-slotid' as slot0
        use 'test:1' as handle0
        Multiplexer
          hostedParticle = ConsumerParticle
          consume annotation as slot0
          list <- handle0
    `, new Loader());

    const recipe = manifest.recipes[0];

    const barType = manifest.findTypeByName('Bar');

    const slotComposer = new FakeSlotComposer({rootContainer: {'slotid': 'dummy-container'}});

    const slotComposerCreateHostedSlot = slotComposer.createHostedSlot;

    let slotsCreated = 0;

    slotComposer.createHostedSlot = (...args) => {
      slotsCreated++;
      return slotComposerCreateHostedSlot.apply(slotComposer, args);
    };

    const arc = new Arc({id: 'test', context: manifest, slotComposer, loader: new Loader()});
    const barStore = await arc.createStore(barType.collectionOf(), null, 'test:1') as CollectionStorageProvider;
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

  it('renders polymorphic multiplexed slots', async () => {
    const helper = await TestHelper.create({
      manifestFilename: './src/runtime/test/particles/artifacts/polymorphic-muxing.recipes'
    });
    const context = helper.arc._context;

    const showOneParticle = context.particles.find(p => p.name === 'ShowOne');
    const showTwoParticle = context.particles.find(p => p.name === 'ShowTwo');
    const showOneSpec = JSON.stringify(showOneParticle.toLiteral());
    const showTwoSpec = JSON.stringify(showTwoParticle.toLiteral());
    const postsStore = context.stores[0];
    const recipeOne = `${showOneParticle.toString()}\nrecipe\n  use '{{item_id}}' as v1\n  slot '{{slot_id}}' as s1\n  ShowOne\n    post <- v1\n    consume item as s1`;
    const recipeTwo = `${showTwoParticle.toString()}\nrecipe\n  use '{{item_id}}' as v1\n  slot '{{slot_id}}' as s1\n  ShowTwo\n    post <- v1\n    consume item as s1`;
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
    assert.lengthOf(helper.slotComposer.contexts.filter(ctx => ctx instanceof HostedSlotContext), 4);
    assert.lengthOf(helper.slotComposer.consumers, 6);
    const itemSlot = helper.slotComposer.consumers.find(s => s.consumeConn.name === 'item');
    assert(itemSlot);
    const items = itemSlot.renderings.map(([subId, item]) => item);

    // verify model
    assert.lengthOf(items, 4);
    [{subId: '1', message: 'x'}, {subId: '2', message: 'y'}, {subId: '3', message: 'z'}, {subId: '4', message: 'w'}].forEach(expected => {
        assert(items.find(item => item.model.subId === expected.subId && item.model.message === expected.message),
              `Cannot find item {subId: '${expected.subId}', message: '${expected.message}'`);
    });

    // verify template names
    for (const item of items) {
      if (item.model.subId === '2') {
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
