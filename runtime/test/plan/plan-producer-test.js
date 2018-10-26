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
import {Recipe} from '../../ts-build/recipe/recipe.js';
import {TestHelper} from '../../testing/test-helper.js';
import {PlanProducer} from '../../ts-build/plan/plan-producer.js';
import {Planificator} from '../../ts-build/plan/planificator.js';

class TestPlanProducer extends PlanProducer {
  constructor(arc, store) {
    super(arc, store);
    this.produceCalledCount = 0;
    this.plannerRunCount = 0;
    this.cancelCount = 0;
    this.producePromises = [];
    this.plannerNextResults = [];
    this.plannerPromise = null;
  }

  async producePlans(options) {
    ++this.produceCalledCount;
    this.producePromises.push(super.producePlans(options));
  }

  _cancelPlanning() {
    ++this.cancelCount;
    this.plannerPromise(null);
    this.plannerPromise = null;
    super._cancelPlanning();
  }

  async allPlanningDone() {
    return Promise.all(this.producePromises).then(() => this.producePromises = []);
  }

  async runPlanner(options) {
    ++this.plannerRunCount;
    return new Promise((resolve, reject) => {
      const plans = this.plannerNextResults.shift();
      if (plans) {
        resolve(plans);
      } else {
        assert(!this.plannerPromise);
        this.plannerPromise = resolve;
      }
    }).then(plans => plans);
  }

  plannerReturnFakeResults(planInfos) {
    const plans = [];
    planInfos.forEach(info => {
      if (!info.hash) {
        info = {hash: info};
      }
      const plan = new Recipe(`recipe${info.hash}`);
      if (!info.options || !info.options.invisible) {
        plan.newSlot('slot0').id = 'id0';
      }
      plan.normalize();
      plans.push({plan, hash: info.hash});
    });
    this.plannerReturnResults(plans);
    return plans;
  }

  plannerReturnResults(plans) {
    if (this.plannerPromise) {
      this.plannerPromise(plans);
      this.plannerPromise = null;
    } else {
      this.plannerNextResults.push(plans);
    }
  }
}

describe('plan producer', function() {
  async function createProducer(manifestFilename) {
    const helper = await TestHelper.createAndPlan({
      manifestFilename: './runtime/test/artifacts/Products/Products.recipes'
    });
    helper.arc.storageKey = 'firebase://xxx.firebaseio.com/yyy/serialization/zzz';
    const store = await Planificator._initStore(helper.arc, {userid: 'TestUser', protocol: 'volatile'});
    assert.isNotNull(store);
    const producer = new TestPlanProducer(helper.arc, store);
    return {helper, producer};
  }
  it('produces plans', async function() {
    const {helper, producer} = await createProducer('./runtime/test/artifacts/Products/Products.recipes');
    assert.lengthOf(producer.result.plans, 0);

    await producer.producePlans();
    assert.lengthOf(producer.result.plans, 0);

    producer.plannerReturnFakeResults(helper.plans);
    await producer.allPlanningDone();
    assert.lengthOf(producer.result.plans, 1);
    assert.equal(producer.produceCalledCount, 1);
    assert.equal(producer.plannerRunCount, 1);
    assert.equal(producer.cancelCount, 0);
  });
  
  it('throttles requests to produce plans', async function() {
    const {helper, producer} = await createProducer('./runtime/test/artifacts/Products/Products.recipes');
    assert.lengthOf(producer.result.plans, 0);

    for (let i = 0; i < 10; ++i) {
      producer.producePlans();
    }

    producer.plannerReturnFakeResults(helper.plans);
    producer.plannerReturnFakeResults(helper.plans);
    await producer.allPlanningDone();
    assert.equal(producer.produceCalledCount, 10);
    assert.equal(producer.plannerRunCount, 2);
    assert.equal(producer.cancelCount, 0);
  });

  it('cancels planning', async function() {
    const {helper, producer} = await createProducer('./runtime/test/artifacts/Products/Products.recipes');
    assert.lengthOf(producer.result.plans, 0);

    producer.producePlans();
    producer.producePlans({cancelOngoingPlanning: true});

    producer.plannerReturnFakeResults(helper.plans);
    await producer.allPlanningDone();
    assert.equal(producer.produceCalledCount, 2);
    assert.equal(producer.plannerRunCount, 2);
    assert.equal(producer.cancelCount, 1);
  });
});
