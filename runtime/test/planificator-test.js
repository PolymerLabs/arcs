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
import {Arc} from '../ts-build/arc.js';
import {Planificator} from '../planificator.js';
import {InitPopulation} from '../strategies/init-population.js';
import {Recipe} from '../ts-build/recipe/recipe.js';

class TestPlanificator extends Planificator {
  constructor(arc, options) {
    super(arc, options);
  }
  _init() {
    this.plannerNextResults = [];
    this.plannerPromise = null;
    this.schedulePromises = [];

    // Counts for number of times planning was requested and performed.
    this.scheduleCount = 0;
    this.planCount = 0;

    super._init();
  }

  async _schedulePlanning(timeout) {
    ++this.scheduleCount;
    this.schedulePromises.push(super._schedulePlanning(timeout));
  }

  _cancelPlanning() {
    this.plannerPromise = null;
    super._cancelPlanning();
  }

  async allPlanningDone() {
    return Promise.all(this.schedulePromises).then(() => this.schedulePromises = []);
  }

  async _doNextPlans(options) {
    this.plannerOptions = options;
    ++this.planCount;
    return new Promise((resolve, reject) => {
      const plans = this.plannerNextResults.shift();
      if (plans) {
        resolve(plans);
      } else {
        assert(!this.plannerPromise);
        this.plannerPromise = resolve;
      }
    }).then(plans => this._next.plans = plans);
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

  _onPlanInstantiated(plan) {
    this._arc.isArcPopulated = true;
    super._onPlanInstantiated(plan);
  }

  _isArcPopulated() {
    // Faking this out to avoid instantiating things for real in this test.
    return !!this._arc.isArcPopulated;
  }
}

async function createPlanificator(options) {
  const arc = new Arc({id: 'demo-test'});
  const planificator = new TestPlanificator(arc, options);
  assert.isTrue(planificator.isFull);

  assert.isTrue(planificator.isPlanning);
  planificator.plannerReturnFakeResults([]);
  await planificator.allPlanningDone();
  assert.isFalse(planificator.isPlanning);

  return planificator;
}

function newPlan(name, options) {
  const plan = new Recipe(name);
  options = options || {};
  if (options.hasSlot) {
    const slot = plan.newSlot(options.hasRootSlot ? 'root' : 'slot0');
    slot.id = 'id0';
  }
  if (options.handlesIds) {
    options.handlesIds.forEach(id => {
      const handle = plan.newHandle();
      handle.id = id;
    });
  }
  return {plan, hash: options.hash || plan.name, descriptionText: options.descriptionText};
}

describe('Planificator', function() {
  it('creates a planificator', async () => {
    const planificator = await createPlanificator();
    assert.lengthOf(planificator._arc.instantiatePlanCallbacks, 1);

    assert.isFalse(planificator.isPlanning);
    assert.equal(0, Object.keys(planificator.getLastActivatedPlan()));
    const {plans} = planificator.getCurrentPlans();
    assert.isEmpty(plans);

    planificator._arc.dispose();
    planificator.dispose();
    assert.isEmpty(planificator._arc.instantiatePlanCallbacks);
    assert.isEmpty(planificator._stateChangedCallbacks);
    assert.isEmpty(planificator._plansChangedCallbacks);
    assert.isEmpty(planificator._suggestChangedCallbacks);
  });

  it('makes replanning requests', async () => {
    const planificator = await createPlanificator();
    for (let i = 0; i < 10; ++i) {
      planificator._requestPlanning();
      assert.isTrue(planificator.isPlanning);
    }

    planificator.plannerReturnFakeResults([1, 2, 3]);
    planificator.plannerReturnFakeResults([3, 4, 5, 6]);

    await planificator.allPlanningDone();

    assert.isFalse(planificator.isPlanning);
    const {plans} = planificator.getCurrentPlans();
    assert.lengthOf(plans, 4);
    assert.equal(11, planificator.scheduleCount);
    assert.equal(3, planificator.planCount);
  });

  it('replans triggered by data change', async () => {
    const planificator = await createPlanificator();
    assert.isFalse(planificator.isPlanning);

    // Trigger replanning
    planificator._onDataChange();
    assert.lengthOf(planificator._dataChangesQueue._changes, 1);
    assert.isNotNull(planificator._dataChangesQueue._replanTimer);
    // setTimeout is needed on data changes replanning is delayed.
    await new Promise((resolve, reject) => setTimeout(async () => resolve(), 300));

    assert.isTrue(planificator.isPlanning);
    assert.isEmpty(planificator.getCurrentPlans().plans);

    planificator.plannerReturnFakeResults([1, 2, 3]);
    await planificator.allPlanningDone();
    assert.isFalse(planificator.isPlanning);
    assert.lengthOf(planificator.getCurrentPlans().plans, 3);

    // Trigger replanning again.
    planificator._arc._onDataChange();
    await new Promise((resolve, reject) => setTimeout(async () => resolve(), 300));
    assert.isTrue(planificator.isPlanning);
    // Current plans are still available.
    assert.lengthOf(planificator.getCurrentPlans().plans, 3);
    planificator.suggestFilter = {showAll: true};
    assert.lengthOf(planificator.getCurrentSuggestions(), 3);
    assert.isEmpty(Object.keys(planificator._past));
  });

  it('groups data change triggered replanning', async () => {
    const planificator = await createPlanificator();

    // Add 3 data change events with intervals.
    planificator._arc._onDataChange();
    await new Promise((resolve, reject) => setTimeout(async () => resolve(), 100));
    planificator._arc._onDataChange();
    await new Promise((resolve, reject) => setTimeout(async () => resolve(), 100));
    planificator._arc._onDataChange();
    // _onDataChange called directly 3 times.
    assert.lengthOf(planificator._dataChangesQueue._changes, 3);
    assert.isNotNull(planificator._dataChangesQueue._replanTimer);
    assert.isFalse(planificator.isPlanning);

    // Wait verify planning has started.
    await new Promise((resolve, reject) => setTimeout(async () => resolve(), 250));
    assert.isTrue(planificator.isPlanning);
  });

  it('caps replanning delay with max-no-replan value', async () => {
    const planificator = await createPlanificator({defaultReplanDelayMs: 100, maxNoReplanMs: 110});

    // Add 3 data change events with intervals.
    planificator._arc._onDataChange();
    await new Promise((resolve, reject) => setTimeout(async () => resolve(), 10));
    planificator._arc._onDataChange();
    await new Promise((resolve, reject) => setTimeout(async () => resolve(), 40));
    planificator._arc._onDataChange();
    // _onDataChange called directly 3 times.
    assert.lengthOf(planificator._dataChangesQueue._changes, 3);
    assert.isNotNull(planificator._dataChangesQueue._replanTimer);
    assert.isFalse(planificator.isPlanning);

    // Wait and verify planning has started.
    await new Promise((resolve, reject) => setTimeout(async () => resolve(), 70));
    assert.isTrue(planificator.isPlanning);
  });

  it('cancels data change triggered replanning if other replanning occured', async () => {
    const planificator = await createPlanificator();
    const plan = new Recipe();
    plan.normalize();
    planificator._setCurrent({plans: [{plan}]});

    // Add 2 data change events.
    planificator._arc._onDataChange();
    planificator._arc._onDataChange();
    // _onDataChange is called directly 2 times.
    assert.lengthOf(planificator._dataChangesQueue._changes, 2);
    assert.isNotNull(planificator._dataChangesQueue._replanTimer);
    assert.isFalse(planificator.isPlanning);

    // Plan instantiated, data change events triggered replanning scheduling is canceled.
    await planificator._arc.instantiate(plan);
    assert.isTrue(planificator.isPlanning);
    assert.isEmpty(planificator._dataChangesQueue._changes);
    assert.isNull(planificator._dataChangesQueue._replanTimer);
  });

  it('delays data triggered replanning if planning is in progress', async () => {
    const planificator = await createPlanificator();

    // Planning in progress.
    planificator._requestPlanning();
    assert.isTrue(planificator.isPlanning);

    // Add 2 data change events - replanning now scheduled, because planning is in progress.
    planificator._arc._onDataChange();
    planificator._arc._onDataChange();
    assert.lengthOf(planificator._dataChangesQueue._changes, 2);
    assert.isNull(planificator._dataChangesQueue._replanTimer);

    const plan = planificator.plannerReturnFakeResults(['test'])[0].plan;
    await planificator.allPlanningDone();
    assert.isFalse(planificator.isPlanning);

    // Delayed replanning is started.
    await new Promise((resolve, reject) => setTimeout(async () => resolve(), 100));
    assert.isFalse(planificator.isPlanning);
    await new Promise((resolve, reject) => setTimeout(async () => resolve(), 100));
    assert.isTrue(planificator.isPlanning);
  });

  it('replans triggered by plan instantiation', async () => {
    const planificator = await createPlanificator();
    planificator._requestPlanning();
    const plan = planificator.plannerReturnFakeResults(['test'])[0].plan;
    await planificator.allPlanningDone();
    assert.lengthOf(planificator.getCurrentSuggestions(), 1);
    assert.equal(plan, planificator.getCurrentSuggestions()[0].plan);

    planificator._arc.instantiate(plan);

    // Planning is triggered and previous suggestions are no long available.
    assert.isTrue(planificator.isPlanning);
    assert.isEmpty(planificator.getCurrentSuggestions());
    assert.equal(plan, planificator.getLastActivatedPlan().plan);
    assert.lengthOf(planificator.getLastActivatedPlan().plans, 1);
  });

  it('triggers plan and state changed callbacks', async () => {
    const planificator = await createPlanificator();
    let stateChanged = 0;
    let suggestionsChanged = 0;
    let visibleSuggestionsChanged = 0;
    planificator.registerStateChangedCallback(() => { ++stateChanged; });
    planificator.registerSuggestionsChangedCallback(() => { ++suggestionsChanged; });
    planificator.registerVisibleSuggestionsChangedCallback(() => { ++visibleSuggestionsChanged; });

    // Request replanning - state changes, plans do not.
    planificator._requestPlanning();
    assert.equal(1, stateChanged);
    assert.equal(0, suggestionsChanged);
    assert.equal(0, visibleSuggestionsChanged);

    // Planning is done and plans are set, both - state and plans change.
    const plan = planificator.plannerReturnFakeResults([1])[0].plan;
    await planificator.allPlanningDone();
    assert.equal(2, stateChanged);
    assert.equal(1, suggestionsChanged);
    assert.equal(1, visibleSuggestionsChanged);

    // Plan is being instantiated, both - state and plans change.
    await planificator._arc.instantiate(plan);
    assert.equal(3, stateChanged);
    assert.equal(2, suggestionsChanged);
    assert.equal(2, visibleSuggestionsChanged);

    // Planning is done and plans are set, both - state and plans change.
    planificator.plannerReturnFakeResults([2]);
    await planificator.allPlanningDone();
    assert.equal(4, stateChanged);
    assert.equal(3, suggestionsChanged);
    assert.equal(3, visibleSuggestionsChanged);

    // Request replanning - state changes, plans do not.
    planificator._requestPlanning();
    assert.equal(5, stateChanged);
    assert.equal(3, suggestionsChanged);
    assert.equal(3, visibleSuggestionsChanged);

    // Same plan is returned - state chagnes, plans do not.
    planificator.plannerReturnFakeResults([2]);
    await planificator.allPlanningDone();
    assert.equal(6, stateChanged);
    assert.equal(3, suggestionsChanged);
    assert.equal(3, visibleSuggestionsChanged);

    // Additional plan returned, but it doesn't have any slots, so not included in suggestions -
    // state and plans change, but suggestions do not.
    planificator._requestPlanning();
    planificator.plannerReturnFakeResults([2, {hash: 3, options: {invisible: true}}]);
    await planificator.allPlanningDone();
    assert.equal(8, stateChanged);
    assert.equal(4, suggestionsChanged);
    assert.equal(3, visibleSuggestionsChanged);
  });
  it('retrieves and filters suggestions', async () => {
    const planificator = await createPlanificator();
    planificator._requestPlanning();

    const plans = [];
    const addPlan = (name, options) => {
      plans.push(newPlan(name, options));
    };
    addPlan('1', {hasSlot: false, descriptionText: 'invisible plan'});
    addPlan('2', {hasSlot: true, descriptionText: '-2- -23- -24- -25- -234- -235- -245- -2345-'});
    addPlan('3', {hasSlot: true, descriptionText: '-3- -23- -34- -35- -234- -235- -345- -2345-'});
    addPlan('4', {hasSlot: true, hasRootSlot: true, descriptionText: '-4- -24- -34- -45- -234- -245- -345- -2345-'});
    addPlan('5', {hasSlot: true, hasRootSlot: true, descriptionText: '-5- -25- -35- -45- -235- -245- -345- -2345-'});

    planificator.plannerReturnResults(plans);
    await planificator.allPlanningDone();

    assert.lengthOf(planificator.getCurrentPlans().plans, plans.length);
    assert.deepEqual(['2', '3'], planificator.getCurrentSuggestions().map(p => p.hash));

    // Search for already visible plan.
    planificator.setSearch('-3-');
    assert.deepEqual(['3'], planificator.getCurrentSuggestions().map(p => p.hash));

    // Search for otherwise nonvisible plan.
    planificator.setSearch('-4-');
    assert.deepEqual(['4'], planificator.getCurrentSuggestions().map(p => p.hash));

    // Search for a mix of visible and nonvisible plans
    planificator.setSearch('-245-');
    assert.deepEqual(['2', '4', '5'], planificator.getCurrentSuggestions().map(p => p.hash));

    // Search for all plans
    planificator.setSearch('-2345-');
    assert.deepEqual(['2', '3', '4', '5'], planificator.getCurrentSuggestions().map(p => p.hash));
    planificator.setSearch('*');
    assert.deepEqual(['2', '3', '4', '5'], planificator.getCurrentSuggestions().map(p => p.hash));

   // Search for plans that aren't available.
   planificator.setSearch('nosuchplan');
   assert.isEmpty(planificator.getCurrentSuggestions());
  });
  it('shows suggestions involving handle from active recipe', async () => {
    const plan0 = newPlan('0', {hasSlot: true, hasRootSlot: true, handlesIds: ['handle0']});
    const plan1 = newPlan('1', {hasSlot: true, hasRootSlot: true, handlesIds: ['handle0']});
    plan1.plan.newSlot('otherSlot').id = 'other-id0';

    const planificator = await createPlanificator();
    planificator._requestPlanning();
    planificator.plannerReturnResults([plan0, plan1]);
    await planificator.allPlanningDone();

    // Plan '0' is excluded from default suggestions, because it renders to 'root' slot.
    assert.isEmpty(planificator.getCurrentSuggestions());

    // Add plan to active recipe.
    newPlan('2', {handlesIds: ['handle0']}).plan.mergeInto(planificator._arc._activeRecipe);

    // Plans '0' and '1' reuse a handle from the active recipe. Only '1' is included in the
    // default suggestion, because it renders into a non-root slot.
    assert.deepEqual(['1'], planificator.getCurrentSuggestions().map(p => p.hash));
  });
  it('sets or appends current', async () => {
    const planificator = await createPlanificator();
    let suggestionsChanged = 0;
    planificator.registerSuggestionsChangedCallback(() => { ++suggestionsChanged; });

    planificator._setCurrent({plans: [], generations: []});
    assert.isEmpty(planificator._current.plans);
    assert.equal(0, suggestionsChanged);

    // Sets current plans
    planificator._setCurrent({plans: [newPlan('1'), newPlan('2')], generations: []});
    assert.deepEqual(['1', '2'], planificator._current.plans.map(p => p.hash));
    assert.equal(1, suggestionsChanged);

    // Overrides current plans
    planificator._setCurrent({plans: [newPlan('3'), newPlan('4')], generations: []});
    assert.deepEqual(['3', '4'], planificator._current.plans.map(p => p.hash));
    assert.equal(2, suggestionsChanged);

    // Appends to current plans.
    planificator._setCurrent({plans: [newPlan('3'), newPlan('5')], generations: []}, true);
    assert.deepEqual(['3', '4', '5'], planificator._current.plans.map(p => p.hash));
    assert.equal(3, suggestionsChanged);

    // Appends already existing plans.
    planificator._setCurrent({plans: [newPlan('4'), newPlan('5')], generations: []}, true);
    assert.deepEqual(['3', '4', '5'], planificator._current.plans.map(p => p.hash));
    assert.equal(3, suggestionsChanged);

    // Appends empty to current plans.
    planificator._setCurrent({plans: [], generations: []}, true);
    assert.deepEqual(['3', '4', '5'], planificator._current.plans.map(p => p.hash));
    assert.equal(3, suggestionsChanged);

    // Override with empty plans.
    planificator._setCurrent({plans: [], generations: []});
    assert.isEmpty(planificator._current.plans);
    assert.equal(4, suggestionsChanged);
  });
  it('cancels planning', async () => {
    const planificator = await createPlanificator();

    // Verify _cancelPlanning stops the planning.
    planificator._requestPlanning();
    assert.isTrue(planificator.isPlanning);

    planificator._cancelPlanning();
    assert.isFalse(planificator.isPlanning);

    // Set the search string and verify it calls _cancelPlanning, if appropriate.
    let cancelCalled = 0;
    const cancelPlanning = planificator._cancelPlanning.bind(planificator);
    planificator._cancelPlanning = () => {
      ++cancelCalled;
      cancelPlanning();
    };
    planificator._requestPlanning();
    planificator.setSearch('this is a new search');
    // Planning isn't canceled, if search is updated while current plans are un-initialized.
    assert.equal(0, cancelCalled);

    planificator._setCurrent({plans: [newPlan()], generations: []});
    planificator.setSearch('this is another new search');
    // Planning is canceled.
    assert.equal(1, cancelCalled);
  });
  it('controls contextual planning', async () => {
    const planificator = await createPlanificator();

    // Initial planning for an empty arc is not contextual.
    planificator._requestPlanning();
    assert.isTrue(planificator.isPlanning);
    assert.isFalse(planificator.plannerOptions.strategyArgs.contextual);
    const plan = newPlan('1');
    planificator.plannerReturnResults([plan]);
    await planificator.allPlanningDone();

    // Once a plan is instantiated, planning should be contextual.
    plan.plan.normalize();
    await planificator._arc.instantiate(plan.plan);
    assert.isTrue(planificator.isPlanning);
    assert.isTrue(planificator.plannerOptions.strategyArgs.contextual);
    planificator.plannerReturnResults([newPlan('2')]);
    await planificator.allPlanningDone();

    // Planning should no longer be contextual if we search for everyhing.
    planificator.setSearch('*');
    assert.isTrue(planificator.isPlanning);
    assert.isFalse(planificator.plannerOptions.strategyArgs.contextual,
      'once search term is entered, planning should again become contextual');
    assert.isNull(planificator.plannerOptions.strategyArgs.search);
    assert.include(planificator.plannerOptions.strategyArgs.strategies, InitPopulation);
    planificator.plannerReturnResults([newPlan('3')]);
    await planificator.allPlanningDone();

    // Clearing search should not cause planning.
    planificator.setSearch('');
    assert.isFalse(planificator.isPlanning);

    // After fetching non contextual suggestions,
    // InitPopulation is not used for non empty search terms.
    planificator.setSearch('hello');
    assert.isTrue(planificator.isPlanning);
    assert.equal(planificator.plannerOptions.strategyArgs.search, 'hello');
    assert.notInclude(planificator.plannerOptions.strategyArgs.strategies, InitPopulation);
    planificator.plannerReturnResults([newPlan('4')]);
    await planificator.allPlanningDone();

    // Once we gathered non contextual suggestions, '*' no longer causes planning.
    planificator.setSearch('*');
    assert.isFalse(planificator.isPlanning);
  });
});

// TODO(mmandlis): add tests for Consumer and Provider planificator modes.
