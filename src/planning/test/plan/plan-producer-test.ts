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
import {Loader} from '../../../runtime/loader.js';
import {Manifest} from '../../../runtime/manifest.js';
import {SingletonStorageProvider} from '../../../runtime/storage/storage-provider-base.js';
import {FakeSlotComposer} from '../../../runtime/testing/fake-slot-composer.js';
import {PlanningTestHelper} from '../../testing/planning-test-helper.js';
import {PlanProducer} from '../../plan/plan-producer.js';
import {Planificator} from '../../plan/planificator.js';
import {PlanningResult} from '../../plan/planning-result.js';
import {Suggestion} from '../../plan/suggestion.js';
import {Id, ArcId} from '../../../runtime/id.js';

class TestPlanProducer extends PlanProducer {
  options;
  produceCalledCount = 0;
  plannerRunOptions = [];
  cancelCount = 0;
  producePromises = [];
  plannerNextResults: Suggestion[][] = [];
  plannerPromise = null;

  constructor(arc, store) {
    super(arc, new PlanningResult({context: arc.context, loader: arc.loader}, store));
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
      const suggestions: Suggestion[] = this.plannerNextResults.shift();

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
['volatile', 'pouchdb://memory/user-test/', 'pouchdb://local/user-test/'].forEach(storageKeyBase => {
  describe('plan producer for ' + storageKeyBase, () => {
    async function createProducer(manifestFilename) {
      const helper = await PlanningTestHelper.createAndPlan({
        manifestFilename: './src/runtime/test/artifacts/Products/Products.recipes',
        storageKey: 'firebase://xxx.firebaseio.com/yyy/serialization/demo'
      });
      const store = await Planificator['_initSuggestStore'](helper.arc, storageKeyBase);
      assert.isNotNull(store);
      const producer = new TestPlanProducer(helper.arc, store);
      return {helper, producer};
    }

  it('produces suggestions', async () => {
    const {helper, producer} = await createProducer('./src/runtime/test/artifacts/Products/Products.recipes');
    assert.lengthOf(producer.result.suggestions, 0);

    await producer.produceSuggestions();
    assert.lengthOf(producer.result.suggestions, 0);

    producer.plannerReturnResults(helper.suggestions);
    await producer.allPlanningDone();
    assert.lengthOf(producer.result.suggestions, 1);
    assert.equal(producer.produceCalledCount, 1);
    assert.equal(producer.plannerRunCount, 1);
    assert.equal(producer.cancelCount, 0);
  });

  it('throttles requests to produce suggestions', async () => {
    const {helper, producer} = await createProducer('./src/runtime/test/artifacts/Products/Products.recipes');
    assert.lengthOf(producer.result.suggestions, 0);

    for (let i = 0; i < 10; ++i) {
      await producer.produceSuggestions({test: i});
    }

    producer.plannerReturnResults(helper.suggestions);
    producer.plannerReturnResults(helper.suggestions);
    await producer.allPlanningDone();
    assert.equal(producer.produceCalledCount, 10);
    assert.equal(producer.plannerRunCount, 2);
    assert.equal(producer.cancelCount, 0);
    assert.equal(0, producer.plannerRunOptions[0].test);
    assert.equal(9, producer.plannerRunOptions[1].test);
  });

  it('cancels planning', async () => {
    const {helper, producer} = await createProducer('./src/runtime/test/artifacts/Products/Products.recipes');
    assert.lengthOf(producer.result.suggestions, 0);

    await producer.produceSuggestions();
    await producer.produceSuggestions({cancelOngoingPlanning: true});

    producer.plannerReturnResults(helper.suggestions);
    await producer.allPlanningDone();
    assert.equal(producer.produceCalledCount, 2);
    assert.equal(producer.plannerRunCount, 2);
    assert.equal(producer.cancelCount, 1);
  });
});

describe('plan producer - search', () => {
  class TestSearchPlanProducer extends PlanProducer {
    options;
    produceSuggestionsCalled = 0;

    constructor(arc: Arc, searchStore: SingletonStorageProvider) {
      super(arc, new PlanningResult({context: arc.context, loader: arc.loader}, searchStore), searchStore);
    }

    async produceSuggestions(options = {}) {
      this.produceSuggestionsCalled++;
      this.options = options;
    }

    async setNextSearch(search: string) {
      await this.searchStore.set([{arc: this.arc.id.idTreeAsString(), search}]);
      return this.onSearchChanged();
    }
  }

  async function init(): Promise<TestSearchPlanProducer> {
    const loader = new Loader();
    const manifest = await Manifest.parse(`
      schema Bar
        Text value
    `);
    const arc = new Arc({slotComposer: new FakeSlotComposer(), loader, context: manifest, id: ArcId.newForTest('test'),
                         storageKey: 'volatile://test^^123'});
    const searchStore = await Planificator['_initSearchStore'](arc);

    const producer = new TestSearchPlanProducer(arc, searchStore);
    assert.isUndefined(producer.search);
    assert.equal(producer.produceSuggestionsCalled, 0);
    return producer;
  }

  it('searches all', async () => {
    const producer = await init();

    // Search for non-contextual results.
    await producer.setNextSearch('*');
    assert.equal(producer.search, '*');
    assert.equal(producer.produceSuggestionsCalled, 1);
    assert.isFalse(producer.options.contextual);

    // Unchanged search term.
    await producer.setNextSearch('*');
    assert.equal(producer.search, '*');
    assert.equal(producer.produceSuggestionsCalled, 1);

    // Requires contextual results only, no need to replan.
    await producer.setNextSearch('');
    assert.equal(producer.search, '');
    assert.equal(producer.produceSuggestionsCalled, 1);
  });

  it('searches for term given contextual results', async () => {
    const producer = await init();

    // Search for a given string
    const search = 'foo';
    await producer.setNextSearch(search);
    assert.equal(search, producer.search);
    assert.equal(producer.produceSuggestionsCalled, 1);
    assert.equal(search, producer.options.search);
    assert.isFalse(producer.options.contextual);
  });

  it('searches for term given non-contextual results', async () => {
    const producer = await init();
    producer.result.contextual = false;

    // Search for a given string
    const search = 'foo';
    await producer.setNextSearch(search);
    assert.equal(search, producer.search);
    assert.equal(producer.produceSuggestionsCalled, 1);
    assert.equal(search, producer.options.search);
    assert.isTrue(producer.options.strategies.map(s => s.name).includes('InitSearch'));
  });
  }); // end describe
}); // end forEach

