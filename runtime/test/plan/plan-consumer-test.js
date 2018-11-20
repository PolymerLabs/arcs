/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import {assert} from '../chai-web.js';
import {FakeSlotComposer} from '../../testing/fake-slot-composer.js';
import {TestHelper} from '../../testing/test-helper.js';
import {PlanConsumer} from '../../ts-build/plan/plan-consumer.js';
import {Planificator} from '../../ts-build/plan/planificator.js';
import {PlanningResult} from '../../ts-build/plan/planning-result.js';

describe('plan consumer', function() {
  it('consumes', async function() {
    const helper = await TestHelper.createAndPlan({
      slotComposer: new FakeSlotComposer(),
      manifestString: `
import './runtime/test/artifacts/Products/Products.recipes'

particle Test1 in './runtime/test/artifacts/consumer-particle.js'
  in [Product] products
  consume root
    provide other
particle Test2 in './runtime/test/artifacts/consumer-particle.js'
  consume other

recipe
  use #shoplist as list
  Test1
    products = list
    consume root
      provide other as other
  Test2
    consume other as other
`
    });
    const userid = 'TestUser';
    helper.arc.storageKey = 'volatile://!158405822139616:demo^^volatile-0';
    const store = await Planificator._initSuggestStore(helper.arc, {userid, protocol: 'volatile'});
    assert.isNotNull(store);
    const consumer = new PlanConsumer(helper.arc, store);

    let suggestionsChangeCount = 0;
    const suggestionsCallback = (suggestions) => { ++suggestionsChangeCount; };
    let visibleSuggestionsChangeCount = 0;
    const visibleSuggestionsCallback = (suggestions) => { ++visibleSuggestionsChangeCount; };
    consumer.registerSuggestionsChangedCallback(suggestionsCallback);
    consumer.registerVisibleSuggestionsChangedCallback(visibleSuggestionsCallback);
    assert.isEmpty(consumer.getCurrentSuggestions());

    const storeResults = async (suggestions) => {
      const result = new PlanningResult(helper.arc);
      result.set({suggestions});
      await store.set(result.serialize());
      await new Promise(resolve => setTimeout(resolve, 100));
    };
    // Updates suggestions.
    await storeResults(helper.findSuggestionByParticleNames(['ItemMultiplexer', 'List']));
    assert.lengthOf(consumer.result.suggestions, 1);
    assert.lengthOf(consumer.getCurrentSuggestions(), 0);
    assert.equal(suggestionsChangeCount, 1);
    assert.equal(visibleSuggestionsChangeCount, 0);

    // Shows all suggestions.
    consumer.setSuggestFilter(true);
    assert.lengthOf(consumer.result.suggestions, 1);
    assert.lengthOf(consumer.getCurrentSuggestions(), 1);
    assert.equal(suggestionsChangeCount, 1);
    assert.equal(visibleSuggestionsChangeCount, 1);

    // Filters suggestions by string.
    consumer.setSuggestFilter(false, 'show');
    assert.lengthOf(consumer.result.suggestions, 1);
    assert.lengthOf(consumer.getCurrentSuggestions(), 1);
    assert.equal(suggestionsChangeCount, 1);
    assert.equal(visibleSuggestionsChangeCount, 1);

    consumer.setSuggestFilter(false);
    assert.lengthOf(consumer.result.suggestions, 1);
    assert.lengthOf(consumer.getCurrentSuggestions(), 0);
    assert.equal(suggestionsChangeCount, 1);
    assert.equal(visibleSuggestionsChangeCount, 2);

    await helper.acceptSuggestion({particles: ['ItemMultiplexer', 'List']});
    await helper.makePlans();
    await storeResults(helper.suggestions);
    assert.lengthOf(consumer.result.suggestions, 3);
    // The [Test1, Test2] recipe is not contextual, and only suggested for search *.
    assert.lengthOf(consumer.getCurrentSuggestions(), 2);

    consumer.setSuggestFilter(true);
    assert.lengthOf(consumer.getCurrentSuggestions(), 3);
  });
});
