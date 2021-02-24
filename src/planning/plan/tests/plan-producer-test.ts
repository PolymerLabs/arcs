/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import {assert} from '../../../platform/chai-web.js';
import {Arc} from '../../../runtime/arc.js';
import {ArcId} from '../../../runtime/id.js';
import {Runtime} from '../../../runtime/runtime.js';
import {storageKeyPrefixForTest, storageKeyForTest} from '../../../runtime/testing/handle-for-test.js';
import {PlanProducer} from '../../plan/plan-producer.js';
import {Planificator} from '../../plan/planificator.js';
import {PlanningResult} from '../../plan/planning-result.js';
import {Suggestion} from '../../plan/suggestion.js';
import {StrategyTestHelper} from '../../testing/strategy-test-helper.js';
import {ActiveSingletonEntityStore, handleForActiveStore} from '../../../runtime/storage/storage.js';

class TestPlanProducer extends PlanProducer {
  options;
  produceCalledCount = 0;
  plannerRunOptions = [];
  cancelCount = 0;
  producePromises = [];
  plannerNextResults: Suggestion[][] = [];
  plannerPromise = null;

  constructor(arc, runtime, store) {
    super(arc, runtime, new PlanningResult({context: arc.context, loader: arc.loader, storageService: arc.storageService}, store));
  }

  async produceSuggestions(options = {}) {
    ++this.produceCalledCount;
    this.producePromises.push(super.produceSuggestions(options));
  }

  _cancelPlanning() {
    ++this.cancelCount;
    this.plannerPromise(null);
    this.plannerPromise = null;
    super._cancelPlanning();
  }

  async allPlanningDone() {
    return Promise.all(this.producePromises).then(() => this.producePromises = []);
  }

  async runPlanner(options, generations): Promise<Suggestion[]> {
    this.plannerRunOptions.push(options);

    return new Promise<Suggestion[]>((resolve, reject) => {
      const suggestions: Suggestion[]|undefined = this.plannerNextResults.shift();

      if (suggestions) {
        resolve(suggestions);
      } else {
        assert(!this.plannerPromise);
        this.plannerPromise = resolve;
      }
    }).then(suggestions => suggestions);
  }

  get plannerRunCount() { return this.plannerRunOptions.length; }

  plannerReturnResults(suggestions: Suggestion[]) {
    if (this.plannerPromise) {
      this.plannerPromise(suggestions);
      this.plannerPromise = null;
    } else {
      this.plannerNextResults.push(suggestions);
    }
  }
}

// Run test suite for each storageKeyBase
describe('plan producer', () => {

  async function createProducer() {
    const runtime = new Runtime();
    runtime.context = await runtime.parseFile('./src/runtime/tests/artifacts/Products/Products.recipes');
    const arc = runtime.getArcById(await runtime.allocator.startArc({arcName: 'demo', storageKeyPrefix: storageKeyPrefixForTest()}));
    const suggestions = await StrategyTestHelper.planForArc(
      runtime,
      runtime.getArcById(await runtime.allocator.startArc({arcName: 'demo', storageKeyPrefix: storageKeyPrefixForTest()}))
    );
    const store = await Planificator['_initSuggestStore'](arc, storageKeyForTest(arc.id));
    assert.isNotNull(store);
    const producer = new TestPlanProducer(arc, runtime, store);
    return {suggestions, producer};
  }

  it('produces suggestions', async () => {
    const {suggestions, producer} = await createProducer();
    assert.lengthOf(producer.result.suggestions, 0);

    await producer.produceSuggestions();
    assert.lengthOf(producer.result.suggestions, 0);

    producer.plannerReturnResults(suggestions);
    await producer.allPlanningDone();
    assert.lengthOf(producer.result.suggestions, 1);
    assert.strictEqual(producer.produceCalledCount, 1);
    assert.strictEqual(producer.plannerRunCount, 1);
    assert.strictEqual(producer.cancelCount, 0);
  });

  it('throttles requests to produce suggestions', async () => {
    const {suggestions, producer} = await createProducer();
    assert.lengthOf(producer.result.suggestions, 0);

    for (let i = 0; i < 10; ++i) {
      await producer.produceSuggestions({test: i});
    }

    producer.plannerReturnResults(suggestions);
    producer.plannerReturnResults(suggestions);
    await producer.allPlanningDone();
    assert.strictEqual(producer.produceCalledCount, 10);
    assert.strictEqual(producer.plannerRunCount, 2);
    assert.strictEqual(producer.cancelCount, 0);
    assert.strictEqual(0, producer.plannerRunOptions[0].test);
    assert.strictEqual(9, producer.plannerRunOptions[1].test);
  });

  it('cancels planning', async () => {
    const {suggestions, producer} = await createProducer();
    assert.lengthOf(producer.result.suggestions, 0);

    await producer.produceSuggestions();
    await producer.produceSuggestions({cancelOngoingPlanning: true});

    producer.plannerReturnResults(suggestions);
    await producer.allPlanningDone();
    assert.strictEqual(producer.produceCalledCount, 2);
    assert.strictEqual(producer.plannerRunCount, 2);
    assert.strictEqual(producer.cancelCount, 1);
  });
});

describe('plan producer - search', () => {
  class TestSearchPlanProducer extends PlanProducer {
    options;
    produceSuggestionsCalled = 0;

    constructor(arc: Arc, runtime: Runtime, searchStore: ActiveSingletonEntityStore) {
      super(arc, runtime, new PlanningResult({context: arc.context, loader: arc.loader, storageService: arc.storageService}, searchStore), searchStore);
    }

    async produceSuggestions(options = {}) {
      this.produceSuggestionsCalled++;
      this.options = options;
    }

    async setNextSearch(search: string) {
      const handle = handleForActiveStore(this.searchStore.storeInfo, this.arc);
      await handle.setFromData({current: JSON.stringify([{arc: this.arc.id.idTreeAsString(), search}])});
      return this.onSearchChanged();
    }
  }

  async function init(): Promise<TestSearchPlanProducer> {
    const runtime = new Runtime();
    runtime.context = await runtime.parse(`
      schema Bar
        value: Text
    `);
    const arc = runtime.getArcById(await runtime.allocator.startArc({arcName: 'test', storageKeyPrefix: storageKeyForTest, arcId: ArcId.newForTest('test')}));
    const searchStore = await Planificator['_initSearchStore'](arc);

    const producer = new TestSearchPlanProducer(arc, runtime, searchStore);
    assert.isUndefined(producer.search);
    assert.strictEqual(producer.produceSuggestionsCalled, 0);
    return producer;
  }

  it('searches all', async () => {
    const producer = await init();

    // Search for non-contextual results.
    await producer.setNextSearch('*');
    assert.strictEqual(producer.search, '*');
    assert.strictEqual(producer.produceSuggestionsCalled, 1);
    assert.isFalse(producer.options.contextual);

    // Unchanged search term.
    await producer.setNextSearch('*');
    assert.strictEqual(producer.search, '*');
    assert.strictEqual(producer.produceSuggestionsCalled, 1);

    // Requires contextual results only, no need to replan.
    await producer.setNextSearch('');
    assert.strictEqual(producer.search, '');
    assert.strictEqual(producer.produceSuggestionsCalled, 1);
  });

  it('searches for term given contextual results', async () => {
    const producer = await init();

    // Search for a given string
    const search = 'foo';
    await producer.setNextSearch(search);
    assert.strictEqual(search, producer.search);
    assert.strictEqual(producer.produceSuggestionsCalled, 1);
    assert.strictEqual(search, producer.options.search);
    assert.isFalse(producer.options.contextual);
  });

  it('searches for term given non-contextual results', async () => {
    const producer = await init();
    producer.result.contextual = false;

    // Search for a given string
    const search = 'foo';
    await producer.setNextSearch(search);
    assert.strictEqual(search, producer.search);
    assert.strictEqual(producer.produceSuggestionsCalled, 1);
    assert.strictEqual(search, producer.options.search);
    assert.isTrue(producer.options.strategies.map(s => s.name).includes('InitSearch'));
  });
});
