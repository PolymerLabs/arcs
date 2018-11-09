/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {assert} from './chai-web.js';
import {SuggestionComposer} from '../suggestion-composer.js';
import {FakeSlotComposer} from '../testing/fake-slot-composer.js';
import {SlotComposer} from '../ts-build/slot-composer.js';
import {TestHelper} from '../testing/test-helper.js';

class TestSuggestionComposer extends SuggestionComposer {
  constructor() {
    super({affordance: 'mock', findContainerByName: () => '<div></div>'});
    this.suggestions = [];
    this.updatesCount = 0;
    this.updateResolve = null;
  }

  async _updateSuggestions(suggestions) {
    ++this.updatesCount;
    return new Promise((resolve, reject) => this.updateResolve = resolve).then(() => this.suggestions = suggestions);
  }

  async updateDone() {
    this.updateResolve();
    return this._updateComplete;
  }
}

describe('suggestion composer', function() {
  it('sets suggestions', async () => {
    const suggestionComposer = new TestSuggestionComposer();
    assert.isEmpty(suggestionComposer.suggestions);

    // Sets suggestions
    await suggestionComposer.setSuggestions([1, 2, 3]);
    assert.equal(1, suggestionComposer.updatesCount);
    assert.isEmpty(suggestionComposer.suggestions);
    await suggestionComposer.updateDone();
    assert.equal(1, suggestionComposer.updatesCount);
    assert.lengthOf(suggestionComposer.suggestions, 3);

    // Sets suggestions several times, only the latest update goes through.
    await suggestionComposer.setSuggestions([4]);
    await suggestionComposer.setSuggestions([5, 6]);
    await suggestionComposer.updateDone();
    assert.equal(2, suggestionComposer.updatesCount);
    assert.lengthOf(suggestionComposer.suggestions, 2);

    await suggestionComposer.setSuggestions([7]);
    await suggestionComposer.setSuggestions([8]);
    await suggestionComposer.setSuggestions([9, 10, 11]);
    await suggestionComposer.setSuggestions([]);
    await suggestionComposer.updateDone();
    await suggestionComposer.updateDone();
    assert.equal(4, suggestionComposer.updatesCount);
    assert.isEmpty(suggestionComposer.suggestions);
  });

  it('singleton suggestion slots', async () => {
    const slotComposer = new FakeSlotComposer();
    const helper = await TestHelper.createAndPlan({
      manifestFilename: './runtime/test/artifacts/suggestions/Cake.recipes',
      slotComposer
    });
    const suggestionComposer = new SuggestionComposer(slotComposer);
    await suggestionComposer._updateSuggestions(helper.plans);
    assert.lengthOf(helper.plans, 1);
    assert.isEmpty(suggestionComposer._suggestConsumers);

    // Accept suggestion and replan: a suggestion consumer is created, but its content is empty.
    await helper.acceptSuggestion({particles: ['MakeCake']});
    await helper.makePlans();
    assert.lengthOf(helper.plans, 1);
    await suggestionComposer._updateSuggestions(helper.plans);
    assert.lengthOf(suggestionComposer._suggestConsumers, 1);
    const suggestConsumer = suggestionComposer._suggestConsumers[0];
    assert.isEmpty(suggestConsumer._content);
    await suggestConsumer._setContentPromise;
    assert.isTrue(suggestConsumer._content.template.includes('Light candles on Tiramisu cake'));

    await helper.acceptSuggestion({particles: ['LightCandles']});
    await helper.makePlans();
    assert.isEmpty(helper.plans);
    await suggestionComposer._updateSuggestions(helper.plans);
    assert.isEmpty(suggestionComposer._suggestConsumers);
  });

  it('suggestion set-slots', async () => {
    const slotComposer = new FakeSlotComposer();
    const helper = await TestHelper.createAndPlan({
      manifestFilename: './runtime/test/artifacts/suggestions/Cakes.recipes',
      slotComposer
    });
    const suggestionComposer = new SuggestionComposer(slotComposer);
    await suggestionComposer._updateSuggestions(helper.plans);
    assert.lengthOf(helper.plans, 1);
    assert.isEmpty(suggestionComposer._suggestConsumers);

    await helper.acceptSuggestion({particles: ['List', 'CakeMuxer']});
    await helper.makePlans();
    assert.lengthOf(helper.plans, 1);
    await suggestionComposer._updateSuggestions(helper.plans);
    assert.lengthOf(suggestionComposer._suggestConsumers, 1);
    const suggestConsumer = suggestionComposer._suggestConsumers[0];
    await suggestConsumer._setContentPromise;
    assert.isTrue(suggestConsumer._content.template.includes('Light candles on Tiramisu cake'));

    await helper.acceptSuggestion({particles: ['LightCandles']});

    await helper.makePlans();
    assert.isEmpty(helper.plans);
    await suggestionComposer._updateSuggestions(helper.plans);
    assert.isEmpty(suggestionComposer._suggestConsumers);
  });
});
