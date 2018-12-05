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
import {PlanProducer} from '../../plan/plan-producer.js';
import {ReplanQueue} from '../../plan/replan-queue.js';

class TestPlanProducer extends PlanProducer {
  constructor() {
    super({}, {});
    this.produceSuggestionsCalled = 0;
  }
  produceSuggestions() {
    this.isPlanning = true;
    ++this.produceSuggestionsCalled;
    this.isPlanning = false;
  }
}

function init(options) {
  options = options || {};
  options.defaultReplanDelayMs = options.defaultReplanDelayMs || 300;
  const producer = new TestPlanProducer();
  const queue = new ReplanQueue(producer, options);
  const expectedCalls = 0;
  assert.isFalse(queue._isReplanningScheduled());
  assert.equal(producer.produceSuggestionsCalled, 0);
  return {producer, queue};
}

describe('replan queue', function() {
  it('triggers planning', async function() {
    const {producer, queue} = init();
    queue.addChange();
    assert.lengthOf(queue.changes, 1);
    assert.equal(producer.produceSuggestionsCalled, 0);
    await new Promise(resolve => setTimeout(resolve, 350));
    assert.equal(producer.produceSuggestionsCalled, 1);
    assert.isEmpty(queue.changes);
  });

  it('triggers one planning for multiple data changes', async function() {
    const {producer, queue} = init();
    queue.addChange();
    queue.addChange();
    queue.addChange();
    assert.lengthOf(queue.changes, 3);
    assert.equal(producer.produceSuggestionsCalled, 0);
    await new Promise(resolve => setTimeout(resolve, 350));
    assert.equal(producer.produceSuggestionsCalled, 1);
    assert.isEmpty(queue.changes);
  });

  it('Postpones replanning due to consequent change', async function() {
    const {producer, queue} = init();
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

  it('caps replanning delay with max-no-replan value', async function() {
    const {producer, queue} = init({maxNoReplanMs: 300});
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
