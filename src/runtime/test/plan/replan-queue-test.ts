/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import {assert} from '../chai-web.js';
import {Arc} from '../../arc.js';
import {Loader} from '../../loader.js';
import {Manifest} from '../../manifest.js';
import {PlanProducer} from '../../plan/plan-producer.js';
import {PlanningResult} from '../../plan/planning-result.js';
import {ReplanQueue} from '../../plan/replan-queue.js';
import {FakeSlotComposer} from '../../testing/fake-slot-composer.js';

class TestPlanProducer extends PlanProducer {
  produceSuggestionsCalled = 0;

  constructor(arc: Arc) {
    super(arc, new PlanningResult({context: arc.context, loader: arc.loader}));
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
  const manifest = await Manifest.parse(`
    schema Bar
      Text value
  `);
  const arc = new Arc({slotComposer: new FakeSlotComposer(), loader, context: manifest, id: 'test'});

  const producer = new TestPlanProducer(arc);
  const queue = new ReplanQueue(producer, options);
  const expectedCalls = 0;
  assert.isFalse(queue.isReplanningScheduled());
  assert.equal(producer.produceSuggestionsCalled, 0);
  return {producer, queue};
}

describe('replan queue', async () => {
  it('triggers planning', async () => {
    const {producer, queue} = await init();
    queue.addChange();
    assert.lengthOf(queue.changes, 1);
    assert.equal(producer.produceSuggestionsCalled, 0);
    await new Promise(resolve => setTimeout(resolve, 350));
    assert.equal(producer.produceSuggestionsCalled, 1);
    assert.isEmpty(queue.changes);
  });

  it('triggers one planning for multiple data changes', async () => {
    const {producer, queue} = await init();
    queue.addChange();
    queue.addChange();
    queue.addChange();
    assert.lengthOf(queue.changes, 3);
    assert.equal(producer.produceSuggestionsCalled, 0);
    await new Promise(resolve => setTimeout(resolve, 350));
    assert.equal(producer.produceSuggestionsCalled, 1);
    assert.isEmpty(queue.changes);
  });

  it('Postpones replanning due to consequent change', async () => {
    const {producer, queue} = await init();
    queue.addChange();
    await new Promise(resolve => setTimeout(resolve, 200));
    queue.addChange();
    assert.lengthOf(queue.changes, 2);
    assert.equal(producer.produceSuggestionsCalled, 0);
    await new Promise(resolve => setTimeout(resolve, 150));
    assert.equal(producer.produceSuggestionsCalled, 0);
    await new Promise(resolve => setTimeout(resolve, 150));
    assert.equal(producer.produceSuggestionsCalled, 1);
    assert.isEmpty(queue.changes);
  });

  it('caps replanning delay with max-no-replan value', async () => {
    const {producer, queue} = await init({maxNoReplanMs: 300});
    queue.addChange();
    await new Promise(resolve => setTimeout(resolve, 200));
    queue.addChange();
    assert.lengthOf(queue.changes, 2);
    assert.equal(producer.produceSuggestionsCalled, 0);
    await new Promise(resolve => setTimeout(resolve, 150));
    assert.equal(producer.produceSuggestionsCalled, 1);
    assert.isEmpty(queue.changes);
  });
});
