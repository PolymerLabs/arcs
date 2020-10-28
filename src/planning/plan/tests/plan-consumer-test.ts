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
import {Modality} from '../../../runtime/arcs-types/modality.js';
import {Relevance} from '../../../runtime/relevance.js';
import {Runtime} from '../../../runtime/runtime.js';
import {storageKeyPrefixForTest} from '../../../runtime/testing/handle-for-test.js';
import {Loader} from '../../../platform/loader.js';
import {PlanConsumer} from '../../plan/plan-consumer.js';
import {Planificator} from '../../plan/planificator.js';
import {PlanningResult} from '../../plan/planning-result.js';
import {Suggestion} from '../../plan/suggestion.js';
import {SuggestFilter} from '../../plan/suggest-filter.js';
import {RamDiskStorageDriverProvider} from '../../../runtime/storage/drivers/ramdisk.js';
import {TestVolatileMemoryProvider} from '../../../runtime/testing/test-volatile-memory-provider.js';
import {DriverFactory} from '../../../runtime/storage/drivers/driver-factory.js';
import {Arc} from '../../../runtime/arc.js';
import {ActiveSingletonEntityStore} from '../../../runtime/storage/storage.js';

async function createPlanConsumer(arc: Arc) {
  const store: ActiveSingletonEntityStore = await Planificator['_initSuggestStore'](arc);
  assert.isNotNull(store);
  const result = new PlanningResult({context: arc.context, loader: arc.loader, storageService: arc.storageService}, store);
  return new PlanConsumer(arc, result);
}

async function storeResults(consumer: PlanConsumer, suggestions: Suggestion[]) {
  assert.isTrue(consumer.result.merge({suggestions}, consumer.arc));
  await consumer.result.flush();
  await new Promise(resolve => setTimeout(resolve, 100));
}

describe('plan consumer', () => {

  beforeEach(() => {
    DriverFactory.clearRegistrationsForTesting();
  });

  afterEach(() => {
    DriverFactory.clearRegistrationsForTesting();
  });

  it('filters suggestions by modality', async () => {
    const initConsumer = async (modality) => {
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
      const arc = runtime.newArc('demo', storageKeyPrefixForTest(), {modality});
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

    const consumerDom = await initConsumer(Modality.dom);
    const domSuggestions = consumerDom.getCurrentSuggestions();
    assert.lengthOf(domSuggestions, 2);
    assert.deepEqual(domSuggestions.map(s => s.plan.particles.map(p => p.name)),
        [['ParticleDom'], ['ParticleDom', 'ParticleBoth']]);
    DriverFactory.clearRegistrationsForTesting();

    const consumerVr = await initConsumer(Modality.vr);
    assert.isEmpty(consumerVr.getCurrentSuggestions());
    DriverFactory.clearRegistrationsForTesting();

    const consumerTouch = await initConsumer(Modality.domTouch);
    const touchSuggestions = consumerTouch.getCurrentSuggestions();
    assert.lengthOf(touchSuggestions, 2);
    assert.deepEqual(touchSuggestions.map(s => s.plan.particles.map(p => p.name)),
       [['ParticleTouch'], ['ParticleTouch', 'ParticleBoth']]);
    DriverFactory.clearRegistrationsForTesting();
  });
});
