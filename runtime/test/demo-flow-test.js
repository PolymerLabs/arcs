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

import {Manifest} from '../manifest.js';
import {Loader} from '../loader.js';
import {assert} from './chai-web.js';
import * as testUtil from '../testing/test-util.js';
import {TestHelper} from '../testing/test-helper.js';

describe('demo flow', function() {
  it('can load the recipe manifest', async function() {
    await Manifest.load('./artifacts/Products/Products.recipes', new Loader());
  });

  it('flows like a demo', async function() {
    let helper = await TestHelper.createAndPlan({
      manifestFilename: './artifacts/Products/Products.recipes',
      expectedNumPlans: 1,
      verify: async plans => {
        let descriptions = await Promise.all(plans.map(plan => plan.description.getRecipeSuggestion()));
        assert.include(descriptions, `Show products from your browsing context (Minecraft Book plus 2 other items).`);
                    //   'Show products from your browsing context (Minecraft Book plus 2 other items) ' +
                    //  'and choose from products recommended based on products from your browsing context ' +
                    //  'and Claire\'s wishlist (Book: How to Draw plus 2 other items).');
      },
      // Note: options below are useful to debug a failing demo-flow-test.
      // slotComposerStrict: false,
      // logging: true
    });

    helper.setTimeout(500);

    // 1. Accept "Show ... and choose ... products" suggestion.
    helper.slotComposer
      .newExpectations()
        .expectRenderSlot('List', 'root', {contentTypes: ['template']})
        .expectRenderSlot('List', 'root', {contentTypes: ['model'], times: 1})
        .expectRenderSlot('ShowProduct', 'item', {contentTypes: ['template', 'model']})
        .expectRenderSlot('ShowProduct', 'item', {contentTypes: ['model'], times: 2})
        .expectRenderSlot('ItemMultiplexer', 'item', {contentTypes: ['template', 'model'], hostedParticle: 'ShowProduct'})
        .expectRenderSlot('ItemMultiplexer', 'item', {contentTypes: ['model'], hostedParticle: 'ShowProduct', times: 2, isOptional: true})
        //.expectRenderSlot('Chooser', 'action', {contentTypes: ['template', 'model']})
        // TODO: investigate why this is called - happens if the first Chooser render happens after
        // ShowCollection is fully rendered (if Chooser has the opportunity to render before last the ShowCollection.model
        // it is not called 2nd time).
        //.expectRenderSlot('Chooser', 'action', {contentTypes: ['model'], isOptional: true})
        //.expectRenderSlot('AlsoOn', 'annotation', {contentTypes: ['template', 'model']})
        //.expectRenderSlot('AlsoOn', 'annotation', {contentTypes: ['model'], times: 2})
        //.expectRenderSlot('Multiplexer2', 'annotation', {contentTypes: ['template']})
        //.expectRenderSlot('Multiplexer2', 'annotation', {verify: helper.slotComposer.expectContentItemsNumber.bind(null, 3)})
        // TODO: the optional Multiplexer2 call only appears if the optional AlsoOn calls happen.
        // But there is no way to currently express this dependency with the mock-slot-composer.
        //.expectRenderSlot('AlsoOn', 'annotation', {contentTypes: ['model'], times: 3, isOptional: true})
        //.expectRenderSlot('Multiplexer2', 'annotation', {verify: helper.slotComposer.expectContentItemsNumber.bind(null, 3), isOptional: true})
        ;
    //await helper.acceptSuggestion({particles: ['ShowCollection', 'Multiplexer', 'Chooser', 'Recommend', 'Multiplexer2']});
    await helper.acceptSuggestion({particles: ['List', 'ItemMultiplexer']});

    assert.lengthOf(helper.arc.findStoresByType(helper.arc.context.findSchemaByName('Product').entityClass().type.collectionOf()), 1);

    await helper.verifySetSize('List', 'items', 3);
    await helper.verifySetSize('ItemMultiplexer', 'list', 3);
    //await helper.verifySetSize('ShowCollection', 'collection', 3);
    //await helper.verifySetSize('Multiplexer', 'list', 3);
    //await helper.verifySetSize('Chooser', 'choices', 3);
    helper.log('----------------------------------------');

    // Replanning.
    let expectedSuggestions = [
      `Check shipping for Claire (Claire)'s Birthday on 2019-08-04.`,
      `Add items from Claire's wishlist (Book: How to Draw plus 2 other items).`,
      'Check manufacturer information for products from your browsing context ' +
        '(Minecraft Book plus 2 other items).',
      `Find out about Claire's interests.`
      /*
      'Buy gifts for Claire\'s Birthday on 2017-08-04, estimate arrival date for ' +
        'products from your browsing context (Minecraft Book plus 2 other items), and estimate ' +
        'arrival date for products recommended based on products from your ' +
        'browsing context and Claire\'s wishlist (Book: How to Draw plus 2 other items).',
      'Recommendations based on Claire\'s wishlist (Book: How to Draw plus 2 other items).',
      'Check manufacturer information for products from your browsing context ' +
        '(Minecraft Book plus 2 other items).',
      'Show Claire\'s wishlist (Book: How to Draw plus 2 other items).',
      'Find alternate shipping for products which won\'t make it on time for products from your browsing context (Minecraft Book plus 2 other items).',
      */
      // TODO: consider whether the 'showList' recipe should resolve to these suggestions?
      // 'Show products from your browsing context (Minecraft Book plus 2 other items).',
      // 'Show products recommended based on products from your browsing context and Claire\'s wishlist (Book: How to Draw plus 2 other items).'
    ];
    await helper.makePlans({expectedNumPlans: 4, expectedSuggestions});
    helper.log('----------------------------------------');
/*
    // 1.5 Select 'Add items from...'
    helper.slotComposer
      .newExpectations()
        .expectRenderSlot('Chooser', 'action', {contentTypes: ['template', 'model']})
        .expectRenderSlot('AlsoOn', 'annotation', {contentTypes: ['template', 'model']})
        .expectRenderSlot('AlsoOn', 'annotation', {contentTypes: ['template', 'model']})
        .expectRenderSlot('AlsoOn', 'annotation', {contentTypes: ['template', 'model']})
        .expectRenderSlot('Multiplexer2', 'annotation', {contentTypes: ['template', 'model']})
        .expectRenderSlot('Chooser', 'action', {contentTypes: ['model']})
        .expectRenderSlot('Multiplexer2', 'annotation', {contentTypes: ['model'], isOptional: true})
        .expectRenderSlot('AlsoOn', 'annotation', {contentTypes: ['model'], isOptional: true})
        .expectRenderSlot('AlsoOn', 'annotation', {contentTypes: ['template', 'model'], isOptional: true})
        .expectRenderSlot('AlsoOn', 'annotation', {contentTypes: ['template', 'model'], isOptional: true})
        .expectRenderSlot('Multiplexer2', 'annotation', {contentTypes: ['template', 'model'], isOptional: true})
        .expectRenderSlot('ItemMultiplexer', 'item', {contentTypes: ['model'], isOptional: true})
        .expectRenderSlot('List', 'root', {contentTypes: ['model'], isOptional: true})
        .expectRenderSlot('Chooser', 'action', {contentTypes: ['model'], isOptional: true})
        .expectRenderSlot('Multiplexer2', 'annotation', {contentTypes: ['model'], isOptional: true})
        .expectRenderSlot('AlsoOn', 'annotation', {contentTypes: ['model'], isOptional: true})
        .expectRenderSlot('ShowProduct', 'item', {contentTypes: ['model'], isOptional: true})
        .expectRenderSlot('Multiplexer2', 'annotation', {contentTypes: ['model'], isOptional: true})
        .expectRenderSlot('ItemMultiplexer', 'item', {contentTypes: ['model'], isOptional: true, ignoreUnexpected: true})

        //.expectRenderSlot('AlsoOn', 'annotation', {contentTypes: ['template', 'model'], times: 2})
        //.expectRenderSlot('Multiplexer2', 'annotation', {contentTypes: ['template', 'model']})
        //.expectRenderSlot('ItemMultiplexer', 'item', {contentTypes: ['model']})
        //.expectRenderSlot('List', 'root', {contentTypes: ['model']})
        //.expectRenderSlot('Multiplexer2', 'annotation', {contentTypes: ['model']})
        //.expectRenderSlot('Chooser', 'action', {contentTypes: ['model']})

        // TODO: investigate why this is called - happens if the first Chooser render happens after
        // ShowCollection is fully rendered (if Chooser has the opportunity to render before last the ShowCollection.model
        // it is not called 2nd time).

        //.expectRenderSlot('Chooser', 'action', {contentTypes: ['model'], isOptional: true})
        //.expectRenderSlot('AlsoOn', 'annotation', {contentTypes: ['template', 'model']})
        //.expectRenderSlot('AlsoOn', 'annotation', {contentTypes: ['model'], times: 2})
        //.expectRenderSlot('Multiplexer2', 'annotation', {contentTypes: ['template']})
        //.expectRenderSlot('Multiplexer2', 'annotation', {verify: helper.slotComposer.expectContentItemsNumber.bind(null, 3)})

        // TODO: the optional Multiplexer2 call only appears if the optional AlsoOn calls happen.
        // But there is no way to currently express this dependency with the mock-slot-composer.

        //.expectRenderSlot('AlsoOn', 'annotation', {contentTypes: ['model'], times: 3, isOptional: true})
        //.expectRenderSlot('Multiplexer2', 'annotation', {verify: helper.slotComposer.expectContentItemsNumber.bind(null, 3), isOptional: true});
        ;
    await helper.acceptSuggestion({particles: ['Recommend', 'Chooser', 'Multiplexer2']});
    await helper.idle();
    helper.log('----------------------------------------');

    // 2. Move an element from recommended list to shortlist.
    let verifyShowCollection = (num, content) => {
      assert(content.model, `Content doesn't have model`);
      assert(content.model.items, `Content model doesn't have items, but expected ${num}.`);
      return content.model.items.length == num && content.model.items.every(i => !!i.resolvedImage);
    };
    helper.slotComposer
      .newExpectations()
        .expectRenderSlot('ShowCollection', 'master', {contentTypes: ['model']})
        .expectRenderSlot('Multiplexer', 'annotation', {verify: verifyShowCollection.bind(null, 4), hostedParticle: 'ShowProduct'})
        .expectRenderSlot('ShowProduct', 'item', {contentTypes: ['model']})
        .expectRenderSlot('Chooser', 'action', {verify: helper.slotComposer.expectContentItemsNumber.bind(null, 2)})
        .expectRenderSlot('AlsoOn', 'annotation', {contentTypes: ['model']})
        .expectRenderSlot('Multiplexer2', 'annotation', {verify: helper.slotComposer.expectContentItemsNumber.bind(null, 4)});
    await helper.sendSlotEvent('Chooser', 'action', '_onChooseValue', {key: '1'});
    await helper.verifySetSize('ShowCollection', 'collection', 4);
    await helper.verifySetSize('Multiplexer', 'list', 4);
    await helper.verifySetSize('Chooser', 'choices', 3);
    helper.log('----------------------------------------');

    // Replanning.
    await helper.makePlans({
      expectedNumPlans: 5,
      expectedSuggestions: expectedSuggestions.map(suggestion => {
        return suggestion.replace('Minecraft Book plus 2 other items', 'Minecraft Book plus 3 other items');
      })
    });
    helper.log('----------------------------------------');

    // 3. Select "Buy gift ... and estimate arrival dates ..." suggestion
    helper.slotComposer
      .newExpectations()
        .expectRenderSlot('GiftList', 'preamble', {contentTypes: ['template', 'model']})
        .expectRenderSlot('Multiplexer', 'annotation', {contentTypes: ['template'], times: 1})
        // TODO: add support in mock-slot-composer for {verify:helper.slotComposer.expectContentItemsNumber.bind(null, N)}
        // for both multiplexers.
        .expectRenderSlot('Multiplexer', 'annotation', {contentTypes: ['model'], times: 2})
        .expectRenderSlot('Multiplexer', 'annotation', {contentTypes: ['model'], times: 7 + 5, isOptional: true})
        .expectRenderSlot('Arrivinator', 'annotation', {contentTypes: ['template', 'templateName', 'model'], times: 4})
        .expectRenderSlot('Arrivinator', 'annotation', {contentTypes: ['template'], times: 3, isOptional: true})
        .expectRenderSlot('Arrivinator', 'annotation', {contentTypes: ['templateName', 'model'], times: 3});
    await helper.acceptSuggestion({particles: ['GiftList', 'Multiplexer', 'Multiplexer']});
    await helper.idle();
    helper.log('----------------------------------------');

    // 4. Move another element from recommended list to shortlist.
    helper.slotComposer
      .newExpectations()
        .expectRenderSlot('ShowCollection', 'master', {contentTypes: ['model']})
        .expectRenderSlot('Multiplexer', 'annotation', {hostedParticle: 'ShowProduct', verify: verifyShowCollection.bind(null, 5)})
        .expectRenderSlot('ShowProduct', 'item', {contentTypes: ['model']})
        .expectRenderSlot('Chooser', 'action', {verify: helper.slotComposer.expectContentItemsNumber.bind(null, 1)})
        .expectRenderSlot('AlsoOn', 'annotation', {contentTypes: ['model']})
        .expectRenderSlot('Multiplexer2', 'annotation', {verify: helper.slotComposer.expectContentItemsNumber.bind(null, 5)})
        .expectRenderSlot('Multiplexer', 'annotation', {contentTypes: ['model'], times: 2, hostedParticle: 'Arrivinator'})
        .expectRenderSlot('Arrivinator', 'annotation', {contentTypes: ['model']});
    await helper.sendSlotEvent('Chooser', 'action', '_onChooseValue', {key: '1'});
    await helper.verifySetSize('ShowCollection', 'collection', 5);
    await helper.verifySetSize('Multiplexer', 'list', 5);
    await helper.verifySetSize('Chooser', 'choices', 3);
    helper.log('----------------------------------------');

    // 5. Select "Check manufacturer information..." suggestion
    await helper.makePlans({expectedNumPlans: 4});
    helper.slotComposer
      .newExpectations()
        .expectRenderSlot('Multiplexer', 'annotation', {contentTypes: ['template'], hostedParticle: 'ManufacturerInfo'})
        .expectRenderSlot('Multiplexer', 'annotation', {hostedParticle: 'ManufacturerInfo', verify: helper.slotComposer.expectContentItemsNumber.bind(null, 5)})
        .expectRenderSlot('ManufacturerInfo', 'annotation', {contentTypes: ['template', 'model'], times: 5});
    await helper.acceptSuggestion({particles: ['Multiplexer'], hostedParticles: ['ManufacturerInfo']});
    helper.log('----------------------------------------');

    // 6. Move the last element to shortlist.
    helper.slotComposer
      .newExpectations()
        .expectRenderSlot('ShowCollection', 'master', {contentTypes: ['model']})
        .expectRenderSlot('Multiplexer', 'annotation', {verify: verifyShowCollection.bind(null, 6), hostedParticle: 'ShowProduct'})
        .expectRenderSlot('ShowProduct', 'item', {contentTypes: ['model']})
        .expectRenderSlot('Chooser', 'action', {verify: (content) => !content.model})
        .expectRenderSlot('Multiplexer2', 'annotation', {verify: helper.slotComposer.expectContentItemsNumber.bind(null, 6)})
        .expectRenderSlot('AlsoOn', 'annotation', {contentTypes: ['model']})
        .expectRenderSlot('Multiplexer', 'annotation', {contentTypes: ['model'], times: 2, hostedParticle: 'Arrivinator'})
        .expectRenderSlot('Arrivinator', 'annotation', {contentTypes: ['model']})
        .expectRenderSlot('Multiplexer', 'annotation', {contentTypes: ['model'], times: 2, hostedParticle: 'ManufacturerInfo'})
        .expectRenderSlot('ManufacturerInfo', 'annotation', {contentTypes: ['model']});
    await helper.sendSlotEvent('Chooser', 'action', '_onChooseValue', {key: '0'});
    await helper.verifySetSize('ShowCollection', 'collection', 6);
    await helper.verifySetSize('Multiplexer', 'list', 6);
    await helper.verifySetSize('Chooser', 'choices', 3);
    helper.log('----------------------------------------');

    // 7. Accept 'Recommendations based on...' suggestion
    await helper.makePlans({expectedNumPlans: 3});

    helper.slotComposer
      .newExpectations()
      .expectRenderSlot('Interests', 'postamble', {contentTypes: ['template', 'model']});
    await helper.acceptSuggestion({particles: ['Interests']});
    await helper.makePlans({expectedNumPlans: 2});
    helper.log('----------------------------------------');
*/
   helper.clearTimeout();

    // TODO(mmandlis): Provide methods in helper to verify slot contents (helper.slotComposer._slots[i]._content).
  }).timeout(10000);
});
