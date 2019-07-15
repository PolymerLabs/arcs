/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {assert} from '../../platform/chai-web.js';
import {Arc} from '../../runtime/arc.js';
import {SlotComposer} from '../../runtime/slot-composer.js';
import {MockSlotComposer} from '../../runtime/testing/mock-slot-composer.js';
import {PlanningTestHelper} from '../testing/planning-test-helper.js';
import {HeadlessSuggestDomConsumer} from '../headless-suggest-dom-consumer.js';
import {PlanningModalityHandler} from '../planning-modality-handler.js';
import {SuggestionComposer} from '../suggestion-composer.js';

class TestSuggestionComposer extends SuggestionComposer {
  get suggestConsumers() {
    return this._suggestConsumers;
  }
}

describe('suggestion composer', () => {
  it('singleton suggestion slots', async () => {
    const slotComposer = new MockSlotComposer({
      modalityHandler: PlanningModalityHandler.createHeadlessHandler(),
    }).newExpectations('debug');

    const helper = await PlanningTestHelper.createAndPlan({
      manifestFilename: './src/runtime/tests/artifacts/suggestions/Cake.recipes',
      slotComposer
    });
    const suggestionComposer = new TestSuggestionComposer(helper.arc, slotComposer);
    await suggestionComposer.setSuggestions(helper.suggestions);
    assert.lengthOf(helper.suggestions, 1);
    assert.isEmpty(suggestionComposer.suggestConsumers);

    slotComposer.newExpectations()
      .expectRenderSlot('MakeCake', 'item', {'contentTypes': ['template', 'model', 'templateName']});

    // Accept suggestion and replan: a suggestion consumer is created, but its content is empty.
    await helper.acceptSuggestion({particles: ['MakeCake']});

    await helper.makePlans();

    assert.lengthOf(helper.suggestions, 1);
    await suggestionComposer.setSuggestions(helper.suggestions);
    assert.lengthOf(suggestionComposer.suggestConsumers, 1);
    const suggestConsumer = suggestionComposer.suggestConsumers[0] as HeadlessSuggestDomConsumer;
    assert.isTrue(suggestConsumer._content.template.includes('Light candles on Tiramisu cake'));

    slotComposer.newExpectations()
      .expectRenderSlot('LightCandles', 'candles', {'contentTypes': ['template', 'model', 'templateName']});

    await helper.acceptSuggestion({particles: ['LightCandles']});
    await helper.makePlans();
    assert.isEmpty(helper.suggestions);
    await suggestionComposer.setSuggestions(helper.suggestions);
    assert.isEmpty(suggestionComposer.suggestConsumers);
    await slotComposer.expectationsCompleted();
  });

  it('suggestion set-slots', async () => {
    const slotComposer = new MockSlotComposer({
      strict: false,
      modalityHandler: PlanningModalityHandler.createHeadlessHandler(),
    }).newExpectations('debug');

    const helper = await PlanningTestHelper.createAndPlan({
      manifestFilename: './src/runtime/tests/artifacts/suggestions/Cakes.recipes',
      slotComposer
    });
    const suggestionComposer = new TestSuggestionComposer(helper.arc, slotComposer);
    await suggestionComposer.setSuggestions(helper.suggestions);
    assert.lengthOf(helper.suggestions, 1);
    assert.isEmpty(suggestionComposer.suggestConsumers);

    slotComposer.newExpectations()
      .expectRenderSlot('List', 'root', {'contentTypes': ['template', 'model', 'templateName']})
      .expectRenderSlot('MakeCake', 'item', {'contentTypes': ['template', 'model', 'templateName']})
      .expectRenderSlot('MakeCake', 'item', {'contentTypes': ['template', 'model', 'templateName']})
      .expectRenderSlot('MakeCake', 'item', {'contentTypes': ['template', 'model', 'templateName']})
      .expectRenderSlot('CakeMuxer', 'item', {'contentTypes': ['template', 'model', 'templateName']});

    await helper.acceptSuggestion({particles: ['List', 'CakeMuxer']});

    await helper.makePlans({includeInnerArcs: true});
    assert.lengthOf(helper.suggestions.filter(s => s.descriptionText === 'Light candles on Tiramisu cake.'), 1);

    await suggestionComposer.setSuggestions(helper.suggestions);
    assert.lengthOf(suggestionComposer.suggestConsumers, 1);
    const suggestConsumer = suggestionComposer.suggestConsumers[0] as HeadlessSuggestDomConsumer;
    assert.isTrue(suggestConsumer._content.template.includes('Light candles on Tiramisu cake'));

    // TODO(mmandlis): Better support in test-helper for instantiating suggestions in inner arcs.
    // Instantiate inner arc's suggestion.
    const innerSuggestion = helper.findSuggestionByParticleNames(['LightCandles'])[0];
    const innerArc = helper.arc.innerArcs[0];

    await innerSuggestion.instantiate(innerArc);

    slotComposer.newExpectations()
      .expectRenderSlot('LightCandles', 'candles', {'contentTypes': ['template', 'model', 'templateName']});
    await helper.idle();


    await helper.makePlans();
    assert.isEmpty(helper.suggestions);

    await suggestionComposer.setSuggestions(helper.suggestions);
    assert.isEmpty(suggestionComposer.suggestConsumers);

    await slotComposer.expectationsCompleted();
  });
});
