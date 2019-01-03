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

describe('planificator', () => {
  it('constructs suggestion and search storage keys for fb arc', async () => {
    const helper = await TestHelper.create(
      {storageKey: 'firebase://arcs-storage.firebaseio.com/AIzaSyBme42moeI-2k8WgXh-6YK_wYyjEXo4Oz8/0_6_0/testuser--LT97ssVNw_ttCZtjlMT'});
    const arc = helper.arc;

    const verifySuggestion = (storageKeyBase) => {
      const key = Planificator.constructSuggestionKey(arc, 'testuser', storageKeyBase);
      assert(key && key.protocol && key.location,
            `Cannot construct key for '${storageKeyBase}' planificator storage key base`);
      assert(key.protocol.length > 0,
            `Invalid protocol in key for '${storageKeyBase}' planificator storage key base`);
      assert(key.location.length > 0,
            `Invalid location in key for '${storageKeyBase}' planificator storage key base`);
    };

    verifySuggestion('volatile://!123:demo^^');
    verifySuggestion('firebase://arcs-test.firebaseio.com/123-456-7890-abcdef/1_2_3');
    verifySuggestion('pouchdb://local/testdb/');

    assert.isTrue(Planificator.constructSearchKey(arc, 'testuser').toString().length > 0);
  });
});

describe('remote planificator', () => {
  const userid = 'test-user';
  // TODO: support arc storage key be in PouchDB as well.
  const storageKey = 'volatile://!123:demo^^abcdef';

  async function createArc(options, storageKey) {
    return (await TestHelper.createAndPlan(
      {...options, slotComposer: new FakeSlotComposer(), storageKey})).arc;
  }
  async function createConsumePlanificator(plannerStorageKeyBase, manifestFilename) {
    return Planificator.create(
      await createArc({manifestFilename}, storageKey),
      {userid, storageKeyBase: plannerStorageKeyBase, onlyConsumer: true, debug: false});
  }

  async function createProducePlanificator(plannerStorageKeyBase, manifestFilename, store, searchStore) {
    return new Planificator(
        await createArc({manifestFilename}, storageKey), userid, store, searchStore);
  }

  async function instantiateAndReplan(consumePlanificator, producePlanificator, suggestionIndex) {
    await consumePlanificator.consumer.result.suggestions[suggestionIndex].instantiate(
        consumePlanificator.arc);
    const serialization = await consumePlanificator.arc.serialize();
    producePlanificator.arc.dispose();
    producePlanificator.dispose();
    producePlanificator = null;
    const deserializedArc = await Arc.deserialize({serialization,
      slotComposer: new FakeSlotComposer(),
      loader: new Loader(),
      fileName: '',
      pecFactory: undefined,
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
      let consumerUpdateCount = 0;
      consumePlanificator.consumer.registerSuggestionsChangedCallback(() => {
        consumerUpdateCount++;
      });

      let expectedConsumerUpdateCount = 0;
      const verifyConsumerResults = async (expectedSuggestionsCount) => {
        ++expectedConsumerUpdateCount;
        while (consumerUpdateCount < expectedConsumerUpdateCount) {
          await delay(100);
        }
        assert.lengthOf(consumePlanificator.consumer.result.suggestions, expectedSuggestionsCount);
      };

      const verifyReplanningAndConsuming = async (expectedSuggestionsCount, expectedDescriptions = []) => {
        // Wait until producer-planificator is done planning and verify resulting suggestions.
        await verifyReplanning(producePlanificator, expectedSuggestionsCount, expectedDescriptions);

        // Wait until consumer-planificator is updated and verify resulting suggestions.
        await verifyConsumerResults(expectedSuggestionsCount);
      };

      // No contextual suggestions for empty arc.
      await verifyReplanningAndConsuming(0);

      // Replan non-contextual.
      await consumePlanificator.setSearch('*');
      assert.isUndefined(consumePlanificator.producer);
      await verifyReplanningAndConsuming(1, ['Show products from your browsing context']);

      // Accept suggestion.
      producePlanificator = await instantiateAndReplan(consumePlanificator, producePlanificator, 0);
      // TODO: There is a redundant `MuxedProductItem.` suggestion, get rid of it.
      await verifyReplanningAndConsuming(3, ['Check shipping', 'Check manufacturer information']);

      assert.notEqual(producePlanificator.producer.result, consumePlanificator.consumer.result);
      assert.isTrue(producePlanificator.producer.result.isEquivalent(consumePlanificator.consumer.result.suggestions));

      producePlanificator = await instantiateAndReplan(consumePlanificator, producePlanificator, 0);
      // TODO: GiftList+Arrivinator recipe is not considered active and appears again. Investigate.
      await verifyConsumerResults(5);
    });
  });
  it(`merges remotely produced suggestions`, async () => {
    const userid = 'test-user';
    const storageKey = 'volatile://!123:demo^^abcdef';

    // Planning with products manifest.
    const productsManifestFilename = './src/runtime/test/artifacts/Products/Products.recipes';
    const showProductsDescription = 'Show products from your browsing context';
    const productsPlanificator = await Planificator.create(
        await createArc({manifestFilename: productsManifestFilename}, storageKey), {userid, debug: false});
    await productsPlanificator.requestPlanning({contextual: false});
    await verifyReplanning(productsPlanificator, 1, [showProductsDescription]);

    // Planning with restaurants manifest using the same arc - results are merged.
    const restaurantsManifestString = `
import './src/runtime/test/artifacts/Restaurants/Restaurants.recipes'
import './src/runtime/test/artifacts/People/Person.schema'
store User of Person 'User' in './src/runtime/test/artifacts/Things/empty.json'
    `;
    const restaurantsPlanificator = new Planificator(
        await createArc({manifestString: restaurantsManifestString}, storageKey),
        userid, productsPlanificator.result.store, productsPlanificator.searchStore);
    await restaurantsPlanificator.loadSuggestions();
    assert.lengthOf(restaurantsPlanificator.result.suggestions, 1);
    assert.isTrue(restaurantsPlanificator.result.suggestions[0].descriptionText.includes(showProductsDescription));

    // Trigger replanning with restaurants context.
    await restaurantsPlanificator.setSearch('*');
    await verifyReplanning(restaurantsPlanificator, 5, [
      showProductsDescription,
      'Extract person\'s location.',
      'Find restaurants near',
      'Make a reservation and find restaurants',
      'You are free at ']);
  });
});
