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
import {TestHelper} from '../testing/test-helper.js';

class TestSuggestionComposer extends SuggestionComposer {
  constructor() {
    super(null, new FakeSlotComposer({containers: {suggestions: {}}}));
    this.suggestions = [];
    this.updatesCount = 0;
    this.updateResolve = null;
  }

  setSuggestions(suggestions) {
    this.suggestions = suggestions;
  }
}

describe('suggestion composer', function() {
  it('sets suggestions', async () => {
    const suggestionComposer = new TestSuggestionComposer();
    assert.isEmpty(suggestionComposer.suggestions);

    // Sets suggestions
    await suggestionComposer.setSuggestions([1, 2, 3]);
    assert.lengthOf(suggestionComposer.suggestions, 3);

    await suggestionComposer.setSuggestions([4, 5]);
    assert.lengthOf(suggestionComposer.suggestions, 2);

    await suggestionComposer.setSuggestions([6, 7, 8]);
    await suggestionComposer.setSuggestions([]);
    assert.isEmpty(suggestionComposer.suggestions);
  });

  it('singleton suggestion slots', async () => {
    const slotComposer = new FakeSlotComposer();
    const helper = await TestHelper.createAndPlan({
      manifestFilename: './src/runtime/test/artifacts/suggestions/Cake.recipes',
      slotComposer
    });
    const suggestionComposer = new SuggestionComposer(helper.arc, slotComposer);
    await suggestionComposer.setSuggestions(helper.suggestions);
    assert.lengthOf(helper.suggestions, 1);
    assert.isEmpty(suggestionComposer._suggestConsumers);

    // Accept suggestion and replan: a suggestion consumer is created, but its content is empty.
    await helper.acceptSuggestion({particles: ['MakeCake']});
    await helper.makePlans();
    assert.lengthOf(helper.suggestions, 1);
    await suggestionComposer.setSuggestions(helper.suggestions);
    assert.lengthOf(suggestionComposer._suggestConsumers, 1);
    const suggestConsumer = suggestionComposer._suggestConsumers[0];
    assert.isTrue(suggestConsumer._content.template.includes('Light candles on Tiramisu cake'));

    await helper.acceptSuggestion({particles: ['LightCandles']});
    await helper.makePlans();
    assert.isEmpty(helper.suggestions);
    await suggestionComposer.setSuggestions(helper.suggestions);
    assert.isEmpty(suggestionComposer._suggestConsumers);
  });

  it('suggestion set-slots', async () => {
    const slotComposer = new FakeSlotComposer();
    const helper = await TestHelper.createAndPlan({
      manifestFilename: './src/runtime/test/artifacts/suggestions/Cakes.recipes',
      slotComposer
    });
    const suggestionComposer = new SuggestionComposer(helper.arc, slotComposer);
    await suggestionComposer.setSuggestions(helper.suggestions);
    assert.lengthOf(helper.suggestions, 1);
    assert.isEmpty(suggestionComposer._suggestConsumers);

    await helper.acceptSuggestion({particles: ['List', 'CakeMuxer']});
    await helper.makePlans({includeInnerArcs: true});
    assert.lengthOf(helper.suggestions.filter(s => s.descriptionText === 'Light candles on Tiramisu cake.'), 1);
    await suggestionComposer.setSuggestions(helper.suggestions);
    assert.lengthOf(suggestionComposer._suggestConsumers, 1);
    const suggestConsumer = suggestionComposer._suggestConsumers[0];
    assert.isTrue(suggestConsumer._content.template.includes('Light candles on Tiramisu cake'));

    // TODO(mmandlis): Better support in test-helper for instantiating suggestions in inner arcs.
    // Instantiate inner arc's suggestion.
    const innerSuggestion = helper.findSuggestionByParticleNames(['LightCandles'])[0];
    const innerArc = helper.arc.innerArcs[0];
    await innerSuggestion.instantiate(innerArc);
    await helper.idle();

    await helper.makePlans();
    assert.isEmpty(helper.suggestions);
    await suggestionComposer.setSuggestions(helper.suggestions);
    assert.isEmpty(suggestionComposer._suggestConsumers);
  });
});
