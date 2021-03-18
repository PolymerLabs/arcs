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
import {Arc} from '../../../runtime/arc.js';
import {Loader} from '../../../platform/loader.js';
import {Manifest} from '../../../runtime/manifest.js';
import {SlotComposer} from '../../../runtime/slot-composer.js';
import {PlanProducer} from '../../plan/plan-producer.js';
import {PlanningResult} from '../../plan/planning-result.js';
import {ReplanQueue} from '../../plan/replan-queue.js';
import {Id, ArcId} from '../../../runtime/id.js';
import {Runtime} from '../../../runtime/runtime.js';

class TestPlanProducer extends PlanProducer {
  produceSuggestionsCalled = 0;

  constructor(arc: Arc, runtime: Runtime) {
    super(arc, runtime, new PlanningResult({context: arc.context, loader: arc.loader, storageService: arc.storageService}));
  }

  async produceSuggestions(options = {}) {
    this.isPlanning = true;
    ++this.produceSuggestionsCalled;
    this.isPlanning = false;
  }
}

async function init(options?) {
  options = options || {};
  options.defaultReplanDelayMs = options.defaultReplanDelayMs || 300;

  const loader = new Loader();
  const context = await Manifest.parse(`
    schema Bar
      value: Text
  `);
  const runtime = new Runtime({loader, context});
  const arc = runtime.getArcById(await runtime.allocator.startArc({arcName: 'test'}));
  const producer = new TestPlanProducer(arc, runtime);
  const queue = new ReplanQueue(producer, options);

  assert.isFalse(queue.isReplanningScheduled());
  assert.strictEqual(producer.produceSuggestionsCalled, 0);
  return {producer, queue};
}

describe('replan queue', () => {
  it('triggers planning', async () => {
    const {producer, queue} = await init();
    queue.addChange();
    assert.lengthOf(queue.changes, 1);
    assert.strictEqual(producer.produceSuggestionsCalled, 0);
    await new Promise(resolve => setTimeout(resolve, 350));
    assert.strictEqual(producer.produceSuggestionsCalled, 1);
    assert.isEmpty(queue.changes);
  });

  it('triggers one planning for multiple data changes', async () => {
    const {producer, queue} = await init();
    queue.addChange();
    queue.addChange();
    queue.addChange();
    assert.lengthOf(queue.changes, 3);
    assert.strictEqual(producer.produceSuggestionsCalled, 0);
    await new Promise(resolve => setTimeout(resolve, 350));
    assert.strictEqual(producer.produceSuggestionsCalled, 1);
    assert.isEmpty(queue.changes);
  });

  it('Postpones replanning due to consequent change', async () => {
    const {producer, queue} = await init();
    queue.addChange();
    await new Promise(resolve => setTimeout(resolve, 200));
    queue.addChange();
    assert.lengthOf(queue.changes, 2);
    assert.strictEqual(producer.produceSuggestionsCalled, 0);
    await new Promise(resolve => setTimeout(resolve, 150));
    assert.strictEqual(producer.produceSuggestionsCalled, 0);
    await new Promise(resolve => setTimeout(resolve, 150));
    assert.strictEqual(producer.produceSuggestionsCalled, 1);
    assert.isEmpty(queue.changes);
  });

  it('caps replanning delay with max-no-replan value', async () => {
    const {producer, queue} = await init({maxNoReplanMs: 300});
    queue.addChange();
    await new Promise(resolve => setTimeout(resolve, 200));
    queue.addChange();
    assert.lengthOf(queue.changes, 2);
    assert.strictEqual(producer.produceSuggestionsCalled, 0);
    await new Promise(resolve => setTimeout(resolve, 150));
    assert.strictEqual(producer.produceSuggestionsCalled, 1);
    assert.isEmpty(queue.changes);
  });
});
