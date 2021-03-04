/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import {assert} from '../../../../../build/platform/chai-web.js';
import {Runtime} from '../../../../../build/runtime/runtime.js';
import {storageKeyPrefixForTest} from '../../../../../build/runtime/testing/handle-for-test.js';
import {PlanConsumer} from '../../../../../build/planning/plan/plan-consumer.js';
import {Planificator} from '../../../../../build/planning/plan/planificator.js';
import {PlanningResult} from '../../../../../build/planning/plan/planning-result.js';
import {Suggestion} from '../../../../../build/planning/plan/suggestion.js';
import {StrategyTestHelper} from '../../../../../build/planning/testing/strategy-test-helper.js';
import {Arc} from '../../../../../build/runtime/arc.js';
import {ActiveSingletonEntityStore} from '../../../../../build/runtime/storage/storage.js';
import '../../../../lib/arcs-ui/dist/install-ui-classes.js';

async function createPlanConsumer(arc: Arc) {
  const store: ActiveSingletonEntityStore = await Planificator['_initSuggestStore'](arc);
  assert.isNotNull(store);
  const result = new PlanningResult({context: arc.context, loader: arc.loader, storageService: arc.storageService}, store);
  return new PlanConsumer(arc, result);
}

async function storeResults(consumer: PlanConsumer, suggestions: Suggestion[]) {
  assert.isTrue(consumer.result.merge({suggestions}, consumer.arc));
  await consumer.result.flush();
  await new Promise(resolve => setTimeout(resolve, 100));
}

describe('plan consumer', () => {
  it('consumes', async () => {
    const manifestText = `
      import './shells/tests/artifacts/Products/Products.recipes'

      particle Test1 in './shells/tests/artifacts/consumer-particle.js'
        products: reads [Product]
        root: consumes Slot
          other: provides? Slot
      particle Test2 in './shells/tests/artifacts/consumer-particle.js'
        other: consumes Slot

      recipe
        list: use #shoplist
        Test1
          products: list
          root: consumes root
            other: provides other
        Test2
          other: consumes other
        description \`Test Recipe\`
    `;

    const runtime = new Runtime();
    runtime.context = await runtime.parse(manifestText);

    const arc = runtime.newArc({arcName: 'demo', storageKeyPrefix: storageKeyPrefixForTest()});
    let suggestions = await StrategyTestHelper.planForArc(runtime, arc);

    const consumer = await createPlanConsumer(arc);
    let suggestionsChangeCount = 0;
    const suggestionsCallback = () => ++suggestionsChangeCount;
    let visibleSuggestionsChangeCount = 0;
    const visibleSuggestionsCallback = () => { ++visibleSuggestionsChangeCount; };
    consumer.registerSuggestionsChangedCallback(suggestionsCallback);
    consumer.registerVisibleSuggestionsChangedCallback(visibleSuggestionsCallback);
    assert.isEmpty(consumer.getCurrentSuggestions());

    // Updates suggestions.
    assert.lengthOf(suggestions, 1);
    assert.deepEqual(suggestions[0].plan.particles.map(p => p.name), ['ItemMultiplexer', 'List']);
    await storeResults(consumer, suggestions);
    assert.lengthOf(consumer.result.suggestions, 1);
    assert.lengthOf(consumer.getCurrentSuggestions(), 0);
    assert.strictEqual(suggestionsChangeCount, 1);
    assert.strictEqual(visibleSuggestionsChangeCount, 1);

    // Shows all suggestions.
    consumer.setSuggestFilter(true);
    assert.lengthOf(consumer.result.suggestions, 1);
    assert.lengthOf(consumer.getCurrentSuggestions(), 1);
    assert.strictEqual(suggestionsChangeCount, 1);
    assert.strictEqual(visibleSuggestionsChangeCount, 2);

    // Filters suggestions by string.
    consumer.setSuggestFilter(false, 'show');
    assert.lengthOf(consumer.result.suggestions, 1);
    assert.lengthOf(consumer.getCurrentSuggestions(), 1);
    assert.strictEqual(suggestionsChangeCount, 1);
    assert.strictEqual(visibleSuggestionsChangeCount, 2);

    consumer.setSuggestFilter(false);
    assert.lengthOf(consumer.result.suggestions, 1);
    assert.lengthOf(consumer.getCurrentSuggestions(), 0);
    assert.strictEqual(suggestionsChangeCount, 1);
    assert.strictEqual(visibleSuggestionsChangeCount, 3);

    await runtime.allocator.runPlanInArc(arc.id, suggestions[0].plan);
    suggestions = await StrategyTestHelper.planForArc(runtime, arc);
    await storeResults(consumer, suggestions);
    assert.lengthOf(consumer.result.suggestions, 3);

    // The [Test1, Test2] recipe is not contextual, and only suggested for search *.
    // TODO(sjmiles): root context detection has changed and I'm deferring repair
    //assert.lengthOf(consumer.getCurrentSuggestions(), 2);

    consumer.setSuggestFilter(true);
    assert.lengthOf(consumer.getCurrentSuggestions(), 3);
  });

});
