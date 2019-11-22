/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import '../../../runtime/storage/firebase/firebase-provider.js';
import '../../../runtime/storage/pouchdb/pouch-db-provider.js';
import {assert} from '../../../platform/chai-web.js';
import {Loader} from '../../../platform/loader.js';
import {Manifest} from '../../../runtime/manifest.js';
import {Arc} from '../../../runtime/arc.js';
import {Id} from '../../../runtime/id.js';
import {Modality} from '../../../runtime/modality.js';
import {Relevance} from '../../../runtime/relevance.js';
import {MockSlotComposer} from '../../../runtime/testing/mock-slot-composer.js';
import {PlanConsumer} from '../../plan/plan-consumer.js';
import {Planificator} from '../../plan/planificator.js';
import {PlanningResult} from '../../plan/planning-result.js';
import {Suggestion} from '../../plan/suggestion.js';
import {SuggestFilter} from '../../plan/suggest-filter.js';
import {Planner} from '../../planner.js';
import {RecipeIndex} from '../../recipe-index.js';
import {Speculator} from '../../speculator.js';
import {PlanningModalityHandler} from '../../planning-modality-handler.js';
import {devtoolsArcInspectorFactory} from '../../../devtools-connector/devtools-arc-inspector.js';
import {devtoolsPlannerInspectorFactory} from '../../../devtools-connector/devtools-planner-inspector.js';

async function setup(slotComposer, storageKeyBase, manifestString) {
  Planner.clearCache();
  const loader = new Loader();
  const context = await Manifest.parse(manifestString, {loader, fileName: ''});
  const arc = new Arc({
    id: Id.fromString('demo'),
    slotComposer,
    loader,
    context,
    storageKey: 'volatile://!158405822139616:demo^^volatile-0',
    inspectorFactory: devtoolsArcInspectorFactory
  });
  const recipeIndex = RecipeIndex.create(arc);
  const store = await Planificator['_initSuggestStore'](arc, storageKeyBase);
  assert.isNotNull(store);
  const consumer = new PlanConsumer(arc, new PlanningResult({context, loader}, store));
  return {arc, recipeIndex, consumer};
}

function findSuggestionByParticleNames(suggestions, particlesNames: string[]): Suggestion[] {
  return suggestions.filter(p => {
    const planParticles = p.plan.particles.map(particle => particle.name);
    return planParticles.length === particlesNames.length && planParticles.every(p => particlesNames.includes(p));
  });
}

async function makePlans(arc, recipeIndex) {
  const planner = new Planner();
  planner.init(arc, {
    strategyArgs: {recipeIndex},
    speculator: new Speculator(),
    inspectorFactory: devtoolsPlannerInspectorFactory
  });
  return planner.suggest();
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
      const slotComposer = new MockSlotComposer({strict: false}).newExpectations('debug');
      const {arc, recipeIndex, consumer} = await setup(slotComposer, storageKeyBase, `
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
      `);

      let suggestions = await makePlans(arc, recipeIndex);
      let suggestionsChangeCount = 0;
      const suggestionsCallback = (suggestions) => ++suggestionsChangeCount;
      let visibleSuggestionsChangeCount = 0;
      const visibleSuggestionsCallback = (suggestions) => { ++visibleSuggestionsChangeCount; };
      consumer.registerSuggestionsChangedCallback(suggestionsCallback);
      consumer.registerVisibleSuggestionsChangedCallback(visibleSuggestionsCallback);
      assert.isEmpty(consumer.getCurrentSuggestions());

      // Updates suggestions.
      await storeResults(consumer, findSuggestionByParticleNames(suggestions, ['ItemMultiplexer', 'List']));
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

      const found = findSuggestionByParticleNames(suggestions, ['ItemMultiplexer', 'List']);
      assert.lengthOf(found, 1);
      await found[0].instantiate(arc);
      await arc.idle;
      await slotComposer.expectationsCompleted();

      suggestions = await makePlans(arc, recipeIndex);
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

    const initConsumer = async (modalityName) => {
      const slotComposer = new MockSlotComposer({
        modalityName,
        modalityHandler: PlanningModalityHandler.createHeadlessHandler()
      });

      const {arc, recipeIndex, consumer} = await setup(slotComposer, 'volatile', `
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
      `);
      assert.lengthOf(arc.context.allRecipes, 4);

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
