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
import {TestHelper} from '../../testing/test-helper.js';
import {PlanConsumer} from '../../ts-build/plan/plan-consumer.js';
import {Planificator} from '../../ts-build/plan/planificator.js';
import {PlanningResult} from '../../ts-build/plan/planning-result.js';

describe('plan consumer', function() {
  it('consumes', async function() {
    const helper = await TestHelper.createAndPlan({
      manifestFilename: './runtime/test/artifacts/Products/Products.recipes'
    });
    const userid = 'TestUser';
    helper.arc.storageKey = 'firebase://xxx.firebaseio.com/yyy/serialization/zzz';
    const store = await Planificator._initSuggestStore(helper.arc, {userid, protocol: 'volatile'});
    assert.isNotNull(store);
    const consumer = new PlanConsumer(helper.arc, store);

    let planChangeCount = 0;
    const planCallback = (plans) => { ++planChangeCount; };
    let suggestChangeCount = 0;
    const suggestCallback = (plans) => { ++suggestChangeCount; };
    consumer.registerPlansChangedCallback(planCallback);
    consumer.registerSuggestChangedCallback(suggestCallback);
    assert.isEmpty(consumer.getCurrentSuggestions());

    const storeResults = async (plans) => {
      const result = new PlanningResult(helper.arc);
      result.set({plans});
      await store.set(result.serialize());
      await new Promise(resolve => setTimeout(resolve, 100));
    };
    // Updates plans.
    await storeResults([helper.plans[0]]);
    assert.lengthOf(consumer.result.plans, 1);
    assert.lengthOf(consumer.getCurrentSuggestions(), 0);
    assert.equal(planChangeCount, 1);
    assert.equal(suggestChangeCount, 0);

    // Shows all suggestions.
    consumer.setSuggestFilter(true);
    assert.lengthOf(consumer.result.plans, 1);
    assert.lengthOf(consumer.getCurrentSuggestions(), 1);
    assert.equal(planChangeCount, 1);
    assert.equal(suggestChangeCount, 1);

    // Filters suggestions by string.
    consumer.setSuggestFilter(false, 'show');
    assert.lengthOf(consumer.result.plans, 1);
    assert.lengthOf(consumer.getCurrentSuggestions(), 1);
    assert.equal(planChangeCount, 1);
    assert.equal(suggestChangeCount, 1);

    consumer.setSuggestFilter(false);
    assert.lengthOf(consumer.result.plans, 1);
    assert.lengthOf(consumer.getCurrentSuggestions(), 0);
    assert.equal(planChangeCount, 1);
    assert.equal(suggestChangeCount, 2);
  });
});
