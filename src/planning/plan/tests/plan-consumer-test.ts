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
import {Manifest} from '../../../runtime/manifest.js';
import {Modality} from '../../../runtime/modality.js';
import {Relevance} from '../../../runtime/relevance.js';
import {Runtime} from '../../../runtime/runtime.js';
import {storageKeyPrefixForTest} from '../../../runtime/testing/handle-for-test.js';
import {Loader} from '../../../platform/loader.js';
import {PlanConsumer} from '../../plan/plan-consumer.js';
import {Planificator} from '../../plan/planificator.js';
import {PlanningResult} from '../../plan/planning-result.js';
import {Suggestion} from '../../plan/suggestion.js';
import {SuggestFilter} from '../../plan/suggest-filter.js';
import {StrategyTestHelper} from '../../testing/strategy-test-helper.js';
import {RamDiskStorageDriverProvider} from '../../../runtime/storageNG/drivers/ramdisk.js';
import {TestVolatileMemoryProvider} from '../../../runtime/testing/test-volatile-memory-provider.js';
import {DriverFactory} from '../../../runtime/storageNG/drivers/driver-factory.js';
import {UnifiedActiveStore} from '../../../runtime/storageNG/unified-store.js';
import {Arc} from '../../../runtime/arc.js';

async function createPlanConsumer(arc: Arc) {
  const store: UnifiedActiveStore = await Planificator['_initSuggestStore'](arc);
  assert.isNotNull(store);
  const result = new PlanningResult({context: arc.context, loader: arc.loader}, store);
  return new PlanConsumer(arc, result);
}

async function storeResults(consumer: PlanConsumer, suggestions: Suggestion[]) {
  assert.isTrue(consumer.result.merge({suggestions}, consumer.arc));
  await consumer.result.flush();
  await new Promise(resolve => setTimeout(resolve, 100));
}

describe('plan consumer', () => {
  it('consumes', async () => {
    const loader = new Loader();
    const memoryProvider = new TestVolatileMemoryProvider();
    RamDiskStorageDriverProvider.register(memoryProvider);
    const context =  await Manifest.parse(`
      import './src/runtime/tests/artifacts/Products/Products.recipes'

      particle Test1 in './src/runtime/tests/artifacts/consumer-particle.js'
        products: reads [Product]
        root: consumes Slot
          other: provides? Slot
      particle Test2 in './src/runtime/tests/artifacts/consumer-particle.js'
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
    `, {loader, fileName: '', memoryProvider});
    const runtime = new Runtime({loader, context, memoryProvider});
    const arc = runtime.newArc('demo', storageKeyPrefixForTest());
    let suggestions = await StrategyTestHelper.planForArc(arc);

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

    await suggestions[0].instantiate(arc);
    suggestions = await StrategyTestHelper.planForArc(arc);
    await storeResults(consumer, suggestions);
    // TODO(sjmiles): the path that attaches handle-information to
    // slot contexts is removed in slot-composer, causing some slots
    // to fail slotMatches()
    assert.lengthOf(consumer.result.suggestions, 3);

    // The [Test1, Test2] recipe is not contextual, and only suggested for search *.
    // TODO(sjmiles): root context detection has changed and I'm deferring repair
    //assert.lengthOf(consumer.getCurrentSuggestions(), 2);

    consumer.setSuggestFilter(true);
    assert.lengthOf(consumer.getCurrentSuggestions(), 3);

    DriverFactory.clearRegistrationsForTesting();
  });

  it('filters suggestions by modality', async () => {
    const initConsumer = async (modalityName) => {
      const addRecipe = (particles) => {
        return `
  recipe
    rootSlot: slot 'slot0'
    ${particles.map(p => `
    ${p}
      root: consumes rootSlot
    `).join('')}
        `;
      };
      const loader = new Loader();
      const memoryProvider = new TestVolatileMemoryProvider();
      RamDiskStorageDriverProvider.register(memoryProvider);
      const context =  await Manifest.parse(`
particle ParticleDom in './src/runtime/tests/artifacts/consumer-particle.js'
  root: consumes Slot
particle ParticleTouch in './src/runtime/tests/artifacts/consumer-particle.js'
  root: consumes Slot
  modality domTouch
particle ParticleBoth in './src/runtime/tests/artifacts/consumer-particle.js'
  root: consumes Slot
  modality dom
  modality domTouch
${addRecipe(['ParticleDom'])}
${addRecipe(['ParticleTouch'])}
${addRecipe(['ParticleDom', 'ParticleBoth'])}
${addRecipe(['ParticleTouch', 'ParticleBoth'])}
        `, {loader, fileName: '', memoryProvider});
      const runtime = new Runtime({loader, context, memoryProvider});
      const arc = runtime.newArc('demo', storageKeyPrefixForTest());
      assert.lengthOf(arc.context.allRecipes, 4);
      const consumer = await createPlanConsumer(arc);
      assert.isNotNull(consumer);
      await storeResults(consumer, arc.context.allRecipes.map((plan, index) => {
        const suggestion = Suggestion.create(plan, /* hash */`${index}`, Relevance.create(arc, plan));
        suggestion.descriptionByModality['text'] = `${plan.name}`;
        return suggestion;
      }));
      assert.lengthOf(consumer.result.suggestions, 4);
      assert.isEmpty(consumer.getCurrentSuggestions());
      consumer.suggestFilter = new SuggestFilter(true);
      return consumer;
    };

    const consumerDom = await initConsumer(Modality.Name.Dom);
    //const domSuggestions = consumerDom.getCurrentSuggestions();
    // TODO(sjmiles): modality detection has changed, this will be restored in a follow-up PR
    //assert.lengthOf(domSuggestions, 2);
    //assert.deepEqual(domSuggestions.map(s => s.plan.particles.map(p => p.name)),
    //    [['ParticleDom'], ['ParticleDom', 'ParticleBoth']]);

    DriverFactory.clearRegistrationsForTesting();

    //const consumerVr = await initConsumer(Modality.Name.Vr);
    // TODO(sjmiles): modality detection has changed, this will be restored in a follow-up PR
    //assert.isEmpty(consumerVr.getCurrentSuggestions());

    DriverFactory.clearRegistrationsForTesting();

    //const consumerTouch = await initConsumer(Modality.Name.DomTouch);
    //const touchSuggestions = consumerTouch.getCurrentSuggestions();
    // TODO(sjmiles): modality detection has changed, this will be restored in a follow-up PR
    //assert.lengthOf(touchSuggestions, 2);
    //assert.deepEqual(touchSuggestions.map(s => s.plan.particles.map(p => p.name)),
    //    [['ParticleTouch'], ['ParticleTouch', 'ParticleBoth']]);

    DriverFactory.clearRegistrationsForTesting();
  });
});
