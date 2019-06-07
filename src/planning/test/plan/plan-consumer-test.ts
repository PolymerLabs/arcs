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
import {Modality} from '../../../runtime/modality.js';
import {Relevance} from '../../../runtime/relevance.js';
import {MockSlotComposer} from '../../../runtime/testing/mock-slot-composer.js';
import {PlanningTestHelper} from '../../testing/planning-test-helper.js';
import {PlanConsumer} from '../../plan/plan-consumer.js';
import {Planificator} from '../../plan/planificator.js';
import {PlanningResult} from '../../plan/planning-result.js';
import {Suggestion} from '../../plan/suggestion.js';
import {PlanningModalityHandler} from '../../planning-modality-handler.js';
import {SuggestFilter} from '../../plan/suggest-filter.js';

async function createPlanConsumer(arcKey, storageKeyBase, helper) {
  helper.arc.storageKey = 'volatile://!158405822139616:demo^^volatile-0';
  const store = await Planificator['_initSuggestStore'](helper.arc, storageKeyBase);
  assert.isNotNull(store);
  return new PlanConsumer(helper.arc, new PlanningResult(helper.envOptions, store));
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
      const helper = await PlanningTestHelper.createAndPlan({
        slotComposer: new MockSlotComposer({strict: false}).newExpectations('debug'),
        manifestString: `
import './src/runtime/test/artifacts/Products/Products.recipes'

particle Test1 in './src/runtime/test/artifacts/consumer-particle.js'
  in [Product] products
  consume root
    provide other
particle Test2 in './src/runtime/test/artifacts/consumer-particle.js'
  consume other

recipe
  use #shoplist as list
  Test1
    products = list
    consume root
      provide other as other
  Test2
    consume other as other
  description \`Test Recipe\`
`
      });
      const consumer = await createPlanConsumer('volatile://!158405822139616:demo^^volatile-0', storageKeyBase, helper);

      let suggestionsChangeCount = 0;
      const suggestionsCallback = (suggestions) => ++suggestionsChangeCount;
      let visibleSuggestionsChangeCount = 0;
      const visibleSuggestionsCallback = (suggestions) => { ++visibleSuggestionsChangeCount; };
      consumer.registerSuggestionsChangedCallback(suggestionsCallback);
      consumer.registerVisibleSuggestionsChangedCallback(visibleSuggestionsCallback);
      assert.isEmpty(consumer.getCurrentSuggestions());

      // Updates suggestions.
      await storeResults(consumer, helper.findSuggestionByParticleNames(['ItemMultiplexer', 'List']));
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
      await storeResults(consumer, helper.suggestions);
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
    slot 'slot0' as rootSlot
    ${particles.map(p => `
    ${p}
      consume root as rootSlot
    `).join('')}
        `;
      };
      const helper = await PlanningTestHelper.create({
        slotComposer: new MockSlotComposer({
          modalityName,
          modalityHandler: PlanningModalityHandler.createHeadlessHandler()
        }),
        manifestString: `
  particle ParticleDom in './src/runtime/test/artifacts/consumer-particle.js'
    consume root
  particle ParticleTouch in './src/runtime/test/artifacts/consumer-particle.js'
    consume root
    modality dom-touch
  particle ParticleBoth in './src/runtime/test/artifacts/consumer-particle.js'
    consume root
    modality dom
    modality dom-touch
  ${addRecipe(['ParticleDom'])}
  ${addRecipe(['ParticleTouch'])}
  ${addRecipe(['ParticleDom', 'ParticleBoth'])}
  ${addRecipe(['ParticleTouch', 'ParticleBoth'])}
  `});
      assert.lengthOf(helper.arc.context.allRecipes, 4);
      const consumer = await createPlanConsumer(
          'volatile://!158405822139616:demo^^volatile-0', 'volatile', helper);
      assert.isNotNull(consumer);
      await storeResults(consumer, helper.arc.context.allRecipes.map((plan, index) => {
        const suggestion = Suggestion.create(plan, /* hash */`${index}`, Relevance.create(helper.arc, plan));
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
