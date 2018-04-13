/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import {assert} from './chai-web.js';
import Arc from '../arc.js';
import Planificator from '../planificator.js';
import Recipe from '../recipe/recipe.js';

class TestPlanificator extends Planificator {
  constructor(arc) {
    super(arc);
    this.plannerNextResults = [];
    this.plannerPromise = null;
    this.schedulePromises = [];

    // Counts for number of times planning was requested and performed.
    this.scheduleCount = 0;
    this.planCount = 0;
  }

  async _schedulePlanning(timeout) {
    ++this.scheduleCount;
    this.schedulePromises.push(super._schedulePlanning(timeout));
  }

  async allPlanningDone() {
    return Promise.all(this.schedulePromises).then(() => this.schedulePromises = []);    
  }

  async _doNextPlans(timeout) {
    ++this.planCount;
    return new Promise((resolve, reject) => {
      let plans = this.plannerNextResults.shift();
      if (plans) {
        resolve({plans, generations: []});
      } else {
        assert(!this.plannerPromise);
        this.plannerPromise = resolve;
      }
    }).then((next) => this._next = next);
  }

  plannerReturnResults(plans) {
    if (this.plannerPromise) {
      this.plannerPromise({plans, generations: []});
      this.plannerPromise = null;
    } else {
      this.plannerNextResults.push(plans);
    }
  }
}

function createPlanificator() {
  let arc = new Arc({id: 'demo-test'});
  return new TestPlanificator(arc);
}

describe('Planificator', function() {
  it('creates a planificator', () => {
    let planificator = createPlanificator();
    assert.isFalse(planificator.isPlanning);
    assert.equal(0, Object.keys(planificator.getLastActivatedPlan()));
    let {plans} = planificator.getCurrentPlans();
    assert.lengthOf(plans, 0);
  });

  it('makes replanning requests', async () => {
    let planificator = createPlanificator();
    for (let i = 0; i < 10; ++i) {
      planificator.requestPlanning();
      assert.isTrue(planificator.isPlanning);
    }

    planificator.plannerReturnResults([1, 2, 3]);
    planificator.plannerReturnResults([3, 4, 5, 6]);

    await planificator.allPlanningDone();

    assert.isFalse(planificator.isPlanning);
    let {plans} = planificator.getCurrentPlans();
    assert.lengthOf(plans, 4);
    assert.equal(10, planificator.scheduleCount);
    assert.equal(2, planificator.planCount);
  });

  it('replans triggered by scheduler', async () => {
    let planificator = createPlanificator();
    assert.isFalse(planificator.isPlanning);

    // Trigger replanning
    planificator._arc._scheduler._triggerIdleCallback();

    assert.isTrue(planificator.isPlanning);
    assert.lengthOf(planificator.getCurrentPlans().plans, 0);

    planificator.plannerReturnResults([1, 2, 3]);
    await planificator.allPlanningDone();
    assert.isFalse(planificator.isPlanning);
    assert.lengthOf(planificator.getCurrentPlans().plans, 3);

    // Trigger replanning again.
    planificator._arc._scheduler._triggerIdleCallback();

    assert.isTrue(planificator.isPlanning);
    // Current plans are still available.
    assert.lengthOf(planificator.getCurrentPlans().plans, 3);
    assert.lengthOf(planificator.getCurrentSuggestions(), 3);
    assert.lengthOf(Object.keys(planificator._past), 0);
  });
  
  it('replans triggered by plan instantiation', async () => {
    let planificator = createPlanificator();
    planificator.requestPlanning();
    let plan = new Recipe('test');
    plan.normalize();
    planificator.plannerReturnResults([{plan}]);
    await planificator.allPlanningDone();
    assert.lengthOf(planificator.getCurrentSuggestions(), 1);
    assert.equal(plan, planificator.getCurrentSuggestions()[0].plan);

    planificator._arc.instantiate(plan);

    // Planning is triggered and previous suggestions are no long available.
    assert.isTrue(planificator.isPlanning);
    assert.lengthOf(planificator.getCurrentSuggestions(), 0);
    assert.equal(plan, planificator.getLastActivatedPlan().activePlan);
    assert.lengthOf(planificator.getLastActivatedPlan().plans, 1);
  });

  it('triggers plan and state changed callbacks', async () => {
    let planificator = createPlanificator();
    let stateChanged = 0;
    let planChanged = 0;
    planificator.registerStateChangedCallback(() => { ++stateChanged; });
    planificator.registerPlansChangedCallback(() => { ++planChanged; });

    // Request replanning - state changes, plans do not.
    planificator.requestPlanning();
    assert.equal(1, stateChanged);
    assert.equal(0, planChanged);

    // Planning is done and plans are set, both - state and plans change.
    let plan = new Recipe('test');
    plan.normalize();
    planificator.plannerReturnResults([{plan}]);
    await planificator.allPlanningDone();
    assert.equal(2, stateChanged);
    assert.equal(1, planChanged);

    // Plan is being instantiated, both - state and plans change.
    planificator._arc.instantiate(plan);
    assert.equal(3, stateChanged);
    assert.equal(2, planChanged);
    
    // Planning is done and plans are set, both - state and plans change.
    planificator.plannerReturnResults([{hash: 1}]);
    await planificator.allPlanningDone();
    assert.equal(4, stateChanged);
    assert.equal(3, planChanged);

    // Request replanning - state changes, plans do not.
    planificator.requestPlanning();
    assert.equal(5, stateChanged);
    assert.equal(3, planChanged);

    // Same plan is returned - state chagnes, plans do not.
    planificator.plannerReturnResults([{hash: 1}]);
    await planificator.allPlanningDone();
    assert.equal(6, stateChanged);
    assert.equal(3, planChanged);
  });
});