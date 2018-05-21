// Copyright (c) 2018 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

import {assert} from '../platform/assert-web.js';
import {now} from '../platform/date-web.js';
import {InitSearch} from './strategies/init-search.js';
import {Planner} from './planner.js';
import {Speculator} from './speculator.js';
import {SuggestionComposer} from './suggestion-composer.js';

let defaultTimeoutMs = 5000;

class ReplanQueue {
  constructor(planificator, options) {
    this._planificator = planificator;
    this._options = options || {};
    this._options.defaultReplanDelayMs = this._options.defaultReplanDelayMs || 3000;

    this._changes = [];
    this._replanTimer = null;
    this._planificator.registerStateChangedCallback(this._onPlanningStateChanged.bind(this));
  }
  addChange() {
    this._changes.push(now());
    if (this._isReplanningScheduled()) {
      this._postponeReplan();
    } else if (!this._planificator.isPlanning) {
      this._scheduleReplan(this._options.defaultReplanDelayMs);
    }
  }

  _onPlanningStateChanged(isPlanning) {
    if (isPlanning) {
      // Cancel scheduled planning.
      this._cancelReplanIfScheduled();
      this._changes = [];
    } else if (this._changes.length > 0) {
      // Schedule delayed planning.
      let timeNow = now();
      this._changes.forEach((ch, i) => this._changes[i] = timeNow);
      this._scheduleReplan(this._options.defaultReplanDelayMs);
    }
  }
  _isReplanningScheduled() {
    return Boolean(this._replanTimer);
  }
  _scheduleReplan(intervalMs) {
    this._cancelReplanIfScheduled();
    this._replanTimer = setTimeout(() => this._planificator._requestPlanning(), intervalMs);
  }
  _cancelReplanIfScheduled() {
    if (this._isReplanningScheduled()) {
      clearTimeout(this._replanTimer);
      this._replanTimer = null;
    }
  }
  _postponeReplan() {
    if (this._changes.length <= 1) {
      return;
    }
    let now = this._changes[this._changes.length - 1];
    let sincePrevChangeMs = now - this._changes[this._changes.length - 2];
    let sinceFirstChangeMs = now - this._changes[0];
    if (this._canPostponeReplan(sinceFirstChangeMs)) {
      this._cancelReplanIfScheduled();
      let nextReplanDelayMs = this._options.defaultReplanDelayMs;
      if (this._options.maxNoReplanMs) {
        nextReplanDelayMs = Math.min(nextReplanDelayMs, this._options.maxNoReplanMs - sinceFirstChangeMs);
      }
      this._scheduleReplan(nextReplanDelayMs);
    }
  }
  _canPostponeReplan(changesInterval) {
    return !this._options.maxNoReplanMs || changesInterval < this._options.maxNoReplanMs;
  }
}

const defaultOptions = {
  defaultReplanDelayMs: 200,
  maxNoReplanMs: 10000
};

export class Planificator {
  constructor(arc, options) {
    this._arc = arc;
    this._speculator = new Speculator();

    // The latest results of a Planner session. These may become 'current', or be disposed as transient,
    // if a new replanning request came in during the Planner execution.
    this._next = {plans: [], generations: []}; // {plans, generations}
    // The current set plans to be presented to the user (full or subset)
    this._current = {plans: [], generations: []}; // {plans, generations}
    this._suggestFilter = {showAll: false};
    // The previous set of suggestions with the plan that was instantiated - copied over from the `current`
    // set, once suggestion is being accepted. Other sets of generated plans aren't stored.
    this._past = {}; // {plan, plans, generations}

    // Callbacks triggered when the `current` set of plans is being updated.
    this._plansChangedCallbacks = [];
    // Callbacks triggered when the current set of suggestions is being updated.
    this._suggestChangedCallbacks = [];
    // Callbacks triggered when Planificator isPlanning state changes.
    this._stateChangedCallbacks = [];

    // planning state
    this._isPlanning = false; // whether planning is ongoing
    this._valid = false; // whether replanning was requested (since previous planning was complete).

    this._dataChangesQueue = new ReplanQueue(this, options || defaultOptions);

    // Set up all callbacks that trigger re-planning.
    this._init();
  }

  _init() {
    // TODO(mmandlis): Planificator subscribes to various change events.
    // Later, it will evaluate and batch events and trigger replanning intelligently.
    // Currently, just trigger replanning for each event.
    this._arcCallback = this._onPlanInstantiated.bind(this);
    this._arc.registerInstantiatePlanCallback(this._arcCallback);

    this._schedulerCallback = this._onDataChanged.bind(this);
    this._arc._scheduler.registerIdleCallback(this._schedulerCallback);

    if (this._arc.pec.slotComposer) {
      let suggestionComposer = new SuggestionComposer(this._arc.pec.slotComposer);
      this.registerSuggestChangedCallback((suggestions) => suggestionComposer.setSuggestions(suggestions));
    }
  }

  dispose() {
    // clear all callbacks the planificator has registered.
    this._arc.unregisterInstantiatePlanCallback(this._arcCallback);
    this._arc._scheduler.unregisterIdleCallback(this._schedulerCallback);
    // clear all planificator's callbacks.
    this._plansChangedCallbacks = [];
    this._suggestChangedCallbacks = [];
    this._stateChangedCallbacks = [];
  }

  get isPlanning() { return this._isPlanning; }
  set isPlanning(isPlanning) {
    if (this._isPlanning != isPlanning) {
      this._isPlanning = isPlanning;
      this._stateChangedCallbacks.forEach(callback => callback(this._isPlanning));
    }
  }
  get suggestFilter() { return this._suggestFilter; }
  set suggestFilter(suggestFilter) {
    assert(!suggestFilter.showAll || !suggestFilter.search);
    this._suggestFilter = suggestFilter;
  }

  setSearch(search) {
    search = search ? search.toLowerCase().trim() : null;
    search = (search !== '') ? search : null;
    let showAll = search === '*';
    search = showAll ? null : search;
    if (showAll == this.suggestFilter.showAll && search == this.suggestFilter.search) {
      return;
    }

    let previousSuggestions = this.getCurrentSuggestions();
    this.suggestFilter = {showAll, search};
    let suggestions = this.getCurrentSuggestions();

    if (this._plansDiffer(suggestions, previousSuggestions)) {
      this._suggestChangedCallbacks.forEach(callback => callback(suggestions));
    }

    if (showAll || !search) {
      // No need to replan: whatever search was before, it was only affecting suggestions filters,
      // comparing to the current sesarch.
      return;
    }

    if (this._arc.search !== search) {
      this._arc.search = search;
      this._requestPlanning({}, {
        // TODO(mmandlis): this excludes InitPopulation from planner strategies and prevents CoalesceRecipes strategy from
        // working properly. Consider reenabling, if possible.
        // // Don't include InitPopulation strategies in replanning.
        // strategies: [InitSearch].concat(Planner.ResolutionStrategies).map(strategy => new strategy(this._arc)),
        // append: true
      });
    }
  }

  getLastActivatedPlan() {
    return this._past; // {plan, plans, generations}
  }
  getCurrentPlans() {
    return this._current; // {plans, generations}
  }
  getCurrentSuggestions() {
    let suggestions = this._current.plans.filter(plan => plan.plan.slots.length > 0) || [];
    if (!this.suggestFilter.showAll) {
      if (this.suggestFilter.search) {
        suggestions = suggestions.filter(suggestion => {
          if (suggestion.plan.search && this.suggestFilter.search.includes(suggestion.plan.search.phrase)) {
            return true;
          }
          return suggestion.descriptionText.toLowerCase().includes(this.suggestFilter.search);
        });
      } else {
        suggestions = suggestions.filter(suggestion => {
          let plan = suggestion.plan;
          let usesHandlesFromActiveRecipe = plan.handles.find(handle => {
            // TODO(mmandlis): find a generic way to exlude system handles (eg Theme), either by tagging or
            // by exploring connection directions etc.
            return !!handle.id && this._arc._activeRecipe.handles.find(activeHandle => activeHandle.id == handle.id);
          });
          let usesRemoteNonRootSlots = plan.slots.find(slot => {
            return !slot.name.includes('root') && !slot.tags.includes('root') && slot.id && !slot.id.includes('root');
          });
          let onlyUsesNonRootSlots = !plan.slots.find(s => s.name.includes('root') || s.tags.includes('root'));
          return (usesHandlesFromActiveRecipe && usesRemoteNonRootSlots) || onlyUsesNonRootSlots;
        });
      }
    }
    return suggestions || [];
  }

  registerPlansChangedCallback(callback) {
    this._plansChangedCallbacks.push(callback);
  }
  registerSuggestChangedCallback(callback) {
    this._suggestChangedCallbacks.push(callback);
  }
  registerStateChangedCallback(callback) {
    this._stateChangedCallbacks.push(callback);
  }

  _onPlanInstantiated(plan) {
    // Check that plan is in this._current.plans;
    if (!this._current.plans.find(currentPlan => currentPlan.plan == plan)) {
      assert(false, `The plan being instantiated (${plan.description}) doesn't appear in the current list of plans`);
    }
    // Move current to past, and clear current;
    this._past = {plan, plans: this._current.plans, generations: this._current.generations};
    this._setCurrent({plans: [], generations: []});
    this._requestPlanning();
  }


  _onDataChanged() {
    this._dataChangesQueue.addChange();
  }

  _requestPlanning(event, options) {
    // Activate replanning and trigger subscribed callbacks.
    return this._schedulePlanning(options || {});
  }

  async _schedulePlanning(options) {
    this._valid = false;
    let results;
    if (!this.isPlanning) {
      this.isPlanning = true;
      try {
        await this._runPlanning(options);
      } catch (x) {
        console.error(x);
      }
      this.isPlanning = false;
      this._setCurrent({plans: this._next.plans, generations: this._next.generations},
                       options.append || false);
    }
  }

  async _runPlanning(options) {
    let time = now();
    while (!this._valid) {
      this._valid = true;
      await this._doNextPlans(options);
    }
    time = ((now() - time) / 1000).toFixed(2);
    console.log(`Produced ${this._next.plans.length} in ${time}s.`);
  }

  _plansDiffer(newPlans, oldPlans) {
    return !oldPlans ||
        oldPlans.length !== newPlans.length ||
        oldPlans.some((s, i) => newPlans[i].hash !== s.hash || newPlans[i].descriptionText != s.descriptionText);
  }

  async _doNextPlans(options) {
    this._next = {generations: []};
    let planner = new Planner();
    planner.init(this._arc, {strategies: (options.strategies || null)});
    this._next.plans = await planner.suggest(options.timeout || defaultTimeoutMs, this._next.generations, this._speculator);
  }

  _setCurrent(current, append) {
    let hasChange = false;
    let newPlans = [];
    if (append) {
      newPlans = current.plans.filter(newPlan => !this._current.plans.find(currentPlan => currentPlan.hash == newPlan.hash));
      hasChange = newPlans.length > 0;
    } else {
      hasChange = this._plansDiffer(current.plans, this._current.plans);
    }

    if (hasChange) {
      let previousSuggestions = this.getCurrentSuggestions();
      if (append) {
        this._current.plans.push(...newPlans);
        this._current.generations.push(...current.generations);
      } else {
        this._current = current;
      }
      this._plansChangedCallbacks.forEach(callback => callback(this._current));
      let suggestions = this.getCurrentSuggestions();
      if (this._plansDiffer(suggestions, previousSuggestions)) {
        this._suggestChangedCallbacks.forEach(callback => callback(suggestions));
      }
    }
  }
}
