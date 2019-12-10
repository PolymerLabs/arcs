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
import {SlotComposerOptions} from '../../../runtime/slot-composer.js';
import {FakeSlotComposer} from '../../../runtime/testing/fake-slot-composer.js';
import {storageKeyPrefixForTest} from '../../../runtime/testing/handle-for-test.js';
import {StubLoader} from '../../../runtime/testing/stub-loader.js';
import {PlanConsumer} from '../../plan/plan-consumer.js';
import {Planificator} from '../../plan/planificator.js';
import {PlanningResult} from '../../plan/planning-result.js';
import {Suggestion} from '../../plan/suggestion.js';
import {SuggestFilter} from '../../plan/suggest-filter.js';
import {PlanningModalityHandler} from '../../planning-modality-handler.js';
import {StrategyTestHelper} from '../../testing/strategy-test-helper.js';
// database providers are optional, these tests use these provider(s)
import '../../../runtime/storage/firebase/firebase-provider.js';
import '../../../runtime/storage/pouchdb/pouch-db-provider.js';

async function createPlanConsumer(storageKeyBase, arc) {
  arc.storageKey = 'volatile://!158405822139616:demo^^volatile-0';
  const store = await Planificator['_initSuggestStore'](arc, storageKeyBase);
  assert.isNotNull(store);
  return new PlanConsumer(
      arc, new PlanningResult({context: arc.context, loader: arc.loader}, store));
}

async function storeResults(consumer, suggestions) {
  assert.isTrue(consumer.result.merge({suggestions}, consumer.arc));
  await consumer.result.flush();
  await new Promise(resolve => setTimeout(resolve, 100));
}

// Run test suite for each storageKeyBase
['volatile', 'pouchdb://memory/user-test/', 'pouchdb://local/user-test/'].forEach(storageKeyBase => {
  describe('plan consumer for ' + storageKeyBase, () => {
    it('consumes', async () => {
      const loader = new StubLoader({});
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
      `, {loader, fileName: ''});
      const runtime = new Runtime(loader, FakeSlotComposer, context);
      const arc = runtime.newArc('demo', storageKeyPrefixForTest());
      let suggestions = await StrategyTestHelper.planForArc(arc);

      const consumer = await createPlanConsumer(storageKeyBase, arc);

      let suggestionsChangeCount = 0;
      const suggestionsCallback = (suggestions) => ++suggestionsChangeCount;
      let visibleSuggestionsChangeCount = 0;
      const visibleSuggestionsCallback = (suggestions) => { ++visibleSuggestionsChangeCount; };
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
      assert.lengthOf(consumer.result.suggestions, 3);
      // The [Test1, Test2] recipe is not contextual, and only suggested for search *.
      assert.lengthOf(consumer.getCurrentSuggestions(), 2);

      consumer.setSuggestFilter(true);
      assert.lengthOf(consumer.getCurrentSuggestions(), 3);
    });
  }); // end describe
}); // end forEach

describe('plan consumer', () => {
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
      const loader = new StubLoader({});
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
        `, {loader, fileName: ''});
      class ModalitySlotComposer extends FakeSlotComposer {
        prototype: {};
        constructor(options?: SlotComposerOptions) {
          super({
            modalityName,
            modalityHandler: PlanningModalityHandler.createHeadlessHandler()
          });
        }
      }
      const runtime = new Runtime(loader, ModalitySlotComposer, context);
      const arc = runtime.newArc('demo', storageKeyPrefixForTest());
      assert.lengthOf(arc.context.allRecipes, 4);
      const consumer = await createPlanConsumer('volatile', arc);
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
    const domSuggestions = consumerDom.getCurrentSuggestions();
    assert.lengthOf(domSuggestions, 2);
    assert.deepEqual(domSuggestions.map(s => s.plan.particles.map(p => p.name)),
        [['ParticleDom'], ['ParticleDom', 'ParticleBoth']]);

    const consumerVr = await initConsumer(Modality.Name.Vr);
    assert.isEmpty(consumerVr.getCurrentSuggestions());

    const consumerTouch = await initConsumer(Modality.Name.DomTouch);
    const touchSuggestions = consumerTouch.getCurrentSuggestions();
    assert.lengthOf(touchSuggestions, 2);
    assert.deepEqual(touchSuggestions.map(s => s.plan.particles.map(p => p.name)),
        [['ParticleTouch'], ['ParticleTouch', 'ParticleBoth']]);
  });
});
