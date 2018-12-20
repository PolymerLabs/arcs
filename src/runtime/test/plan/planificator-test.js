/**
 * @license
 * Copyright (c) 2018 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import {assert} from '../chai-web.js';
import {Arc} from '../../arc.js';
import {FakeSlotComposer} from '../../testing/fake-slot-composer.js';
import {Loader} from '../../loader.js';
import {Planificator} from '../../plan/planificator.js';
import {TestHelper} from '../../testing/test-helper.js';

describe('planificator', function() {
  it('constructs suggestion and search storage keys for fb arc', async () => {
    const helper = await TestHelper.create();
    const arc = helper.arc;
    arc.storageKey = 'firebase://arcs-storage.firebaseio.com/AIzaSyBme42moeI-2k8WgXh-6YK_wYyjEXo4Oz8/0_6_0/testuser--LT97ssVNw_ttCZtjlMT';

    const verifySuggestion = (storageKeyBase) => {
      const key = Planificator._constructSuggestionKey(arc, 'testuser', storageKeyBase);
      assert(key && key.protocol && key.location,
            `Cannot construct key for '${storageKeyBase}' planificator storage key base`);
      assert(key.protocol.length > 0,
            `Invalid protocol in key for '${storageKeyBase}' planificator storage key base`);
      assert(key.location.length > 0,
            `Invalid location in key for '${storageKeyBase}' planificator storage key base`);
    };

    verifySuggestion();
    verifySuggestion('volatile://!123:demo^^');
    verifySuggestion('firebase://arcs-test.firebaseio.com/123-456-7890-abcdef/1_2_3');
    verifySuggestion('pouchdb://local/testdb/');

    assert.isTrue(Planificator._constructSearchKey(arc, 'testuser').toString().length > 0);
  });
});

describe('remote planificator', function() {
  const userid = 'test-user';
  // TODO: support arc storage key be in PouchDB as well.
  const storageKey = 'volatile://!123:demo^^abcdef';

  async function createConsumePlanificator(plannerStorageKeyBase, manifestFilename) {
    return Planificator.create(
      (await TestHelper.createAndPlan({manifestFilename, slotComposer: new FakeSlotComposer(), storageKey})).arc,
      {userid, storageKeyBase: plannerStorageKeyBase, onlyConsumer: true, debug: false});
  }

  async function createProducePlanificator(plannerStorageKeyBase, manifestFilename, store, searchStore) {
    return new Planificator(
        (await TestHelper.createAndPlan({manifestFilename,
                                         slotComposer: new FakeSlotComposer(),
                                         storageKey})).arc,
        userid, store, searchStore);
  }

  async function instantiateAndReplan(consumePlanificator, producePlanificator, suggestionIndex, log) {
    await consumePlanificator.consumer.result.suggestions[suggestionIndex].instantiate(
        consumePlanificator.arc);
    const serialization = await consumePlanificator.arc.serialize();
    producePlanificator.arc.dispose();
    producePlanificator.dispose();
    producePlanificator = null;
    const deserializedArc = await Arc.deserialize({serialization,
        slotComposer: new FakeSlotComposer(), loader: new Loader(), fileName: '',
        context: consumePlanificator.arc.context});
    producePlanificator = new Planificator(
      deserializedArc,
      consumePlanificator.userid,
      consumePlanificator.consumer.result.store,
      consumePlanificator.searchStore,
      /* onlyConsumer= */ false,
      /* debug= */ false);
    producePlanificator.requestPlanning({contextual: true});
    return producePlanificator;
  }

  async function delay(ms) {
    return await new Promise(resolve => setTimeout(resolve, ms));
  }

  async function verifyReplanning(producePlanificator, expectedSuggestions, expectedDescriptions = []) {
    assert.isTrue(producePlanificator.producer.isPlanning);
    // Wait for the planner finish.
    while (producePlanificator.producer.isPlanning) {
      await delay(100);
    }
    assert.isFalse(producePlanificator.producer.isPlanning);
    assert.lengthOf(producePlanificator.producer.result.suggestions, expectedSuggestions);

    for (const description of expectedDescriptions) {
      assert.lengthOf(producePlanificator.producer.result.suggestions.filter(
          s => s.descriptionText.includes(description)), 1, `Suggestion '${description}' is not found.`);
    }
  }

  async function init(plannerStorageKeyBase, manifestFilename) {
    const consumePlanificator =
    await createConsumePlanificator(plannerStorageKeyBase, manifestFilename);
    const producePlanificator = await createProducePlanificator(plannerStorageKeyBase,
      manifestFilename, consumePlanificator.consumer.result.store, consumePlanificator.searchStore);
    producePlanificator.requestPlanning({contextual: true});
    return {consumePlanificator, producePlanificator};
  }

  [null, 'pouchdb://memory/user/'].forEach(plannerStorageKeyBase => {
    it(`consumes remotely produced gifts demo from ${plannerStorageKeyBase}`, async () => {
      let {consumePlanificator, producePlanificator} = await init(
          plannerStorageKeyBase,
          './src/runtime/test/artifacts/Products/Products.recipes');

      // No contextual suggestions for empty arc.
      await verifyReplanning(producePlanificator, 0);

      // Replan non-contextual.
      await consumePlanificator.setSearch('*');
      await verifyReplanning(producePlanificator, 1, ['Show products from your browsing context']);
      assert.isUndefined(consumePlanificator.producer);
      assert.lengthOf(consumePlanificator.consumer.result.suggestions, 1);

      // Accept suggestion.
      producePlanificator = await instantiateAndReplan(consumePlanificator, producePlanificator, 0);
      // TODO: There is a redundant `MuxedProductItem.` suggestion, get rid of it.
      await verifyReplanning(producePlanificator, 3, ['Check shipping', 'Check manufacturer information']);

      assert.lengthOf(consumePlanificator.consumer.result.suggestions, 3);
      assert.notEqual(producePlanificator.producer.result, consumePlanificator.consumer.result);
      assert.isTrue(producePlanificator.producer.result.isEquivalent(consumePlanificator.consumer.result.suggestions));

      producePlanificator = await instantiateAndReplan(consumePlanificator, producePlanificator, 0);
      // TODO: GiftList+Arrivinator recipe is not considered active and appears again. Investigate.
      await verifyReplanning(producePlanificator, 5);
    });
  });
});
