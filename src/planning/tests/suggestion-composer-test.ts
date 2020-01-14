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
//import {Arc} from '../../runtime/arc.js';
import {Manifest} from '../../runtime/manifest.js';
import {Runtime} from '../../runtime/runtime.js';
import {SlotComposerOptions} from '../../runtime/slot-composer.js';
import {MockSlotComposer} from '../../runtime/testing/mock-slot-composer.js';
import {SlotTestObserver} from '../../runtime/testing/slot-test-observer.js';
import {storageKeyPrefixForTest} from '../../runtime/testing/handle-for-test.js';
import {Loader} from '../../platform/loader.js';
import {TestVolatileMemoryProvider} from '../../runtime/testing/test-volatile-memory-provider.js';
import {PlanningModalityHandler} from '../planning-modality-handler.js';
import {Planner} from '../planner.js';
import {Speculator} from '../speculator.js';
import {SuggestionComposer} from '../suggestion-composer.js';
import {ConCap} from '../../testing/test-util.js';
import {StrategyTestHelper} from '../testing/strategy-test-helper.js';

class TestSuggestionComposer extends SuggestionComposer {
  get suggestConsumers() {
    return this._suggestConsumers;
  }
}

describe('suggestion composer', () => {
  it('singleton suggestion slots', async () => {
    const loader = new Loader();
    const memoryProvider = new TestVolatileMemoryProvider();
    const context = await Manifest.load('./src/runtime/tests/artifacts/suggestions/Cake.recipes', loader, {memoryProvider});
    const runtime = new Runtime({loader, context, memoryProvider});
    const arc = runtime.newArc('demo', storageKeyPrefixForTest());

    const slotComposer = arc.pec.slotComposer;
    const observer = new SlotTestObserver();
    slotComposer.observeSlots(observer);

    const suggestions = await StrategyTestHelper.planForArc(arc);
    assert.lengthOf(suggestions, 1);

    const suggestionComposer = ConCap.silence(() => new TestSuggestionComposer(arc, slotComposer));
    await suggestionComposer.setSuggestions(suggestions);
    assert.isEmpty(suggestionComposer.suggestConsumers);

    observer.newExpectations()
      .expectRenderSlot('MakeCake', 'item')
      ;

    // Accept suggestion and replan: a suggestion consumer is created, but its content is empty.
    assert.deepEqual(suggestions[0].plan.particles.map(p => p.name), ['MakeCake']);
    await suggestions[0].instantiate(arc);
    await arc.idle;
    const suggestions1 = await StrategyTestHelper.planForArc(arc);

    assert.lengthOf(suggestions1, 1);
    await suggestionComposer.setSuggestions(suggestions1);
    assert.lengthOf(suggestionComposer.suggestConsumers, 1);

    observer.newExpectations()
      .expectRenderSlot('LightCandles', 'special')
      ;

    assert.deepEqual(suggestions1[0].plan.particles.map(p => p.name), ['LightCandles']);
    await suggestions1[0].instantiate(arc);
    await arc.idle;

    const suggestions2 = await StrategyTestHelper.planForArc(arc);
    assert.isEmpty(suggestions2);
    await suggestionComposer.setSuggestions(suggestions);
    assert.isEmpty(suggestionComposer.suggestConsumers);

    await observer.expectationsCompleted();
  });

  it('suggestion set-slots', async () => {
    const loader = new Loader();
    const memoryProvider = new TestVolatileMemoryProvider();
    const manifestFile = './src/runtime/tests/artifacts/suggestions/Cakes.recipes';
    const context = await Manifest.load(manifestFile, loader, {memoryProvider});
    const runtime = new Runtime({loader, context, memoryProvider});
    const arc = runtime.newArc('demo', storageKeyPrefixForTest());

    const slotComposer = arc.pec.slotComposer;
    const observer = new SlotTestObserver();
    slotComposer.observeSlots(observer);

    const suggestions = await StrategyTestHelper.planForArc(arc);

    const suggestionComposer = ConCap.silence(() => new TestSuggestionComposer(arc, slotComposer));
    await suggestionComposer.setSuggestions(suggestions);
    assert.lengthOf(suggestions, 1);
    assert.isEmpty(suggestionComposer.suggestConsumers);

    observer.newExpectations()
      .expectRenderSlot('List', 'root')
      .expectRenderSlot('MakeCake', 'item')
      .expectRenderSlot('MakeCake', 'item')
      .expectRenderSlot('MakeCake', 'item')
      ;

    assert.deepEqual(suggestions[0].plan.particles.map(p => p.name).sort(), ['CakeMuxer', 'List']);
    await suggestions[0].instantiate(arc);
    await arc.idle;

    const planner = new Planner();
    planner.init(arc, {strategyArgs: StrategyTestHelper.createTestStrategyArgs(arc), speculator: new Speculator()});
    let suggestions1 = await planner.suggest();
    for (const innerArc of arc.innerArcs) {
      const innerPlanner = new Planner();
      innerPlanner.init(innerArc, {strategyArgs: StrategyTestHelper.createTestStrategyArgs(arc), speculator: new Speculator()});
      suggestions1 = suggestions1.concat(await innerPlanner.suggest());
    }
    assert.lengthOf(suggestions1.filter(s => s.descriptionText === 'Light candles on Tiramisu cake.'), 1);

    await suggestionComposer.setSuggestions(suggestions1);
    assert.lengthOf(suggestionComposer.suggestConsumers, 1);

    // Instantiate inner arc's suggestion.
    const innerSuggestion = suggestions1.find(s => s.plan.particles.some(p => p.name === 'LightCandles'));
    const innerArc = arc.innerArcs[0];

    await innerSuggestion.instantiate(innerArc);

    observer.newExpectations()
      .expectRenderSlot('LightCandles', 'special')
      ;
    await arc.idle;

    const suggestions2 = await StrategyTestHelper.planForArc(arc);
    assert.isEmpty(suggestions2);

    await suggestionComposer.setSuggestions(suggestions2);
    assert.isEmpty(suggestionComposer.suggestConsumers);

    await observer.expectationsCompleted();
  });
});
