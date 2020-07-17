/**
 * @license
 * Copyright (c) 2018 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import {assert} from '../../../platform/chai-web.js';
import {Arc} from '../../../runtime/arc.js';
import {Manifest} from '../../../runtime/manifest.js';
import {Runtime} from '../../../runtime/runtime.js';
import {SlotComposer} from '../../../runtime/slot-composer.js';
import {Loader} from '../../../platform/loader.js';
import {RamDiskStorageDriverProvider} from '../../../runtime/storage/drivers/ramdisk.js';
import {TestVolatileMemoryProvider} from '../../../runtime/testing/test-volatile-memory-provider.js';
import {Planificator} from '../../plan/planificator.js';
import {PlanningResult} from '../../plan/planning-result.js';
import {floatingPromiseToAudit} from '../../../runtime/util.js';
import {DriverFactory} from '../../../runtime/storage/drivers/driver-factory.js';
import {storageKeyPrefixForTest, storageKeyForTest} from '../../../runtime/testing/handle-for-test.js';
import {MockFirebaseStorageKey} from '../../../runtime/storage/testing/mock-firebase.js';

describe('planificator', () => {
  it('constructs suggestion and search storage keys for fb arc', async () => {
    const runtime = new Runtime();
    const arcStorageKey = () => new MockFirebaseStorageKey('location');
    const arc = runtime.newArc('demo', arcStorageKey);

    const verifySuggestion = (storageKeyBase) => {
      const key = Planificator.constructSuggestionKey(arc, storageKeyBase);
      assert(key && key.protocol,
            `Cannot construct key for '${storageKeyBase}' planificator storage key base`);
      assert(key.protocol.length > 0,
            `Invalid protocol in key for '${storageKeyBase}' planificator storage key base`);
    };

    verifySuggestion(storageKeyForTest(arc.id));
    verifySuggestion(new MockFirebaseStorageKey('planificator location'));

    assert.isTrue(Planificator.constructSearchKey(arc).toString().length > 0);
  });
});

describe('remote planificator', () => {
  // TODO: support arc storage key be in PouchDB as well.
  let arcStorageKey;

  let memoryProvider;
  beforeEach(() => {
    arcStorageKey = storageKeyPrefixForTest();
    memoryProvider = new TestVolatileMemoryProvider();
    RamDiskStorageDriverProvider.register(memoryProvider);
  });

  afterEach(() => {
    DriverFactory.clearRegistrationsForTesting();
  });

  async function createArc(options, storageKey) {
    const {manifestString, manifestFilename} = options;
    const loader = new Loader();
    const context = manifestString
        ? await Manifest.parse(manifestString, {loader, fileName: '', memoryProvider})
        : await Manifest.load(manifestFilename, loader, {memoryProvider});
    const runtime = new Runtime({loader, context, memoryProvider});
    return runtime.newArc('demo', storageKey);
  }
  async function createConsumePlanificator(manifestFilename) {
    const arc = await createArc({manifestFilename}, arcStorageKey);
    const storageKeyBase = storageKeyForTest(arc.id);
    return Planificator.create(arc, {storageKeyBase, onlyConsumer: true, debug: false});
  }

  function createPlanningResult(arc, store) {
    return new PlanningResult({context: arc.context, loader: arc.loader}, store);
  }

  async function createProducePlanificator(manifestFilename, store, searchStore) {
    const arc = await createArc({manifestFilename}, arcStorageKey);
    return new Planificator(arc, createPlanningResult(arc, store), searchStore);
  }

  async function instantiateAndReplan(consumePlanificator, producePlanificator, suggestionIndex) {
    const suggestion = consumePlanificator.consumer.result.suggestions[suggestionIndex];
    await consumePlanificator.arc.instantiate(suggestion.plan);
    const serialization = await consumePlanificator.arc.serialize();
    //
    producePlanificator.arc.dispose();
    producePlanificator.dispose();
    producePlanificator = null;
    //
    await consumePlanificator.setSearch(null);
    await consumePlanificator.consumer.result.clear();
    //
    const deserializedArc = await Arc.deserialize({serialization,
      slotComposer: new SlotComposer(),
      loader: new Loader(),
      fileName: '',
      pecFactories: undefined,
      context: consumePlanificator.arc.context
    });
    //
    producePlanificator = new Planificator(
      deserializedArc,
      createPlanningResult(consumePlanificator.arc, consumePlanificator.result.store),
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
    // Wait for the planner to finish.
    while (producePlanificator.producer.isPlanning) {
      await delay(100);
    }
    assert.isFalse(producePlanificator.producer.isPlanning);
    assert.lengthOf(producePlanificator.producer.result.suggestions, expectedSuggestions);

    for (const description of expectedDescriptions) {
      const filteredSuggestions = producePlanificator.producer.result.suggestions.filter(
          s => !!s.descriptionText && s.descriptionText.includes(description));
      if (filteredSuggestions.length === 0) {
        console.log(`Existing suggestions:${producePlanificator.producer.result.suggestions.map(suggestion => suggestion.descriptionText)}`);
      }
      assert.isNotEmpty(filteredSuggestions, `Suggestion '${description}' is not found.`);
      assert.lengthOf(filteredSuggestions, 1, `Multiple suggestions corresponding to '${description}' were found:\n${filteredSuggestions.map(s => s.descriptionText).join('\n')}`);
    }
  }

  async function init(manifestFilename) {
    const consumePlanificator =
        await createConsumePlanificator(manifestFilename);
    const producePlanificator = await createProducePlanificator(
        manifestFilename, consumePlanificator.consumer.result.store, consumePlanificator.searchStore);
    // TODO: Awaiting this promise causes tests to fail...
    floatingPromiseToAudit(producePlanificator.requestPlanning({contextual: true}));
    return {consumePlanificator, producePlanificator};
  }

  it(`consumes remotely produced gifts demo from`, async () => {
    let {consumePlanificator, producePlanificator} = await init(
        './src/runtime/tests/artifacts/Products/Products.recipes');
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
    await verifyReplanning(producePlanificator, 0);
    await delay(100);
    assert.lengthOf(consumePlanificator.consumer.result.suggestions, 0);

    // Replan non-contextual.
    await consumePlanificator.setSearch('*');
    assert.isUndefined(consumePlanificator.producer);
    await verifyReplanningAndConsuming(1, ['Show products from your browsing context']);

    // Accept suggestion.
    producePlanificator = await instantiateAndReplan(consumePlanificator, producePlanificator, 0);
    await verifyReplanningAndConsuming(3, ['Check shipping', 'Check manufacturer information']);

    assert.notStrictEqual(producePlanificator.producer.result, consumePlanificator.consumer.result);
    assert.isTrue(producePlanificator.producer.result.isEquivalent(consumePlanificator.consumer.result.suggestions));

    // TODO: This doesn't behave as expected in neither old nor new storage stack.
    // The instantiated plan is being suggested still being suggested in both cases,
    // but `&addFromWishlist` does not.
    // producePlanificator = await instantiateAndReplan(consumePlanificator, producePlanificator, 0);
    // await verifyConsumerResults(5);
  });

  // TODO(sjmiles): missing information about skip decision
  it.skip(`merges remotely produced suggestions`, async () => {
    // Planning with products manifest.
    const productsManifestString = `
import './src/runtime/tests/artifacts/Places/ExtractLocation.manifest'
import './src/runtime/tests/artifacts/Restaurants/FindRestaurants.manifest'
import './src/runtime/tests/artifacts/Restaurants/RestaurantDetail.manifest'
import './src/runtime/tests/artifacts/Restaurants/RestaurantList.manifest'
import './src/runtime/tests/artifacts/Restaurants/RestaurantMasterDetail.manifest'
import './src/runtime/tests/artifacts/Events/PartySize.manifest'
import './src/runtime/tests/artifacts/Restaurants/ReservationAnnotation.manifest'
import './src/runtime/tests/artifacts/Restaurants/ReservationForm.manifest'
import './src/runtime/tests/artifacts/Events/Calendar.manifest'
import './src/runtime/tests/artifacts/Products/Products.recipes'
    `;
    const showProductsDescription = 'Show products from your browsing context';
    const productsPlanificator = await Planificator.create(
        await createArc({manifestString: productsManifestString}, arcStorageKey), {debug: false});
    await productsPlanificator.requestPlanning({contextual: false});
    await verifyReplanning(productsPlanificator, 1, [showProductsDescription]);

    // Planning with restaurants manifest using the same arc - results are merged.
    const restaurantsManifestString = `
import './src/runtime/tests/artifacts/Common/List.manifest'
import './src/runtime/tests/artifacts/Restaurants/Restaurants.recipes'
import './src/runtime/tests/artifacts/People/Person.schema'
store User of Person 'User' in './src/runtime/tests/artifacts/Things/empty.json'
import './src/runtime/tests/artifacts/Products/Product.schema'
particle ShowProduct in 'show-product.js'
  product: reads Product
  item: consumes Slot
  `;
    const restaurantsPlanificator = new Planificator(
        await createArc({manifestString: restaurantsManifestString}, arcStorageKey),
        createPlanningResult(productsPlanificator.arc, productsPlanificator.result.store),
        productsPlanificator.searchStore);
    assert.isTrue(restaurantsPlanificator.producer.result.contextual);
    await restaurantsPlanificator.loadSuggestions();
    assert.isFalse(restaurantsPlanificator.producer.result.contextual);
    assert.lengthOf(restaurantsPlanificator.result.suggestions, 1);
    assert.isTrue(restaurantsPlanificator.result.suggestions[0].descriptionText.includes(showProductsDescription));

    // Trigger replanning with restaurants context.
    await restaurantsPlanificator.setSearch('*');
    // result is NOT contextual, so re-planning is not automatically triggered.
    assert.isFalse(restaurantsPlanificator.producer.isPlanning);
    await restaurantsPlanificator.requestPlanning();
    await verifyReplanning(restaurantsPlanificator, 5, [
      showProductsDescription,
      'Extract person\'s location.',
      'Find restaurants near person\'s location.',
      'Find restaurants near person\'s location and make a reservation',
      'you are free at ']);
  });
});
