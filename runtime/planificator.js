// Copyright (c) 2018 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt
'use strict';

import assert from '../platform/assert-web.js';
import Type from './type.js';
import Planner from './planner.js';

let defaultTimeoutMs = 5000;

export default class Planificator {
  constructor(arc) {
    this._arc = arc;

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

    // Set up all callbacks that trigger re-planning.
    this._init();
  }

  _init() {
    // TODO(mmandlis): PlannerController subscribes to various change events.
    // Later, it will evaluate and batch events and trigger replanning intelligently.
    // Currently, just trigger replanning for each event.
    this._arc.registerInstantiatePlanCallback(this.onPlanInstantiated.bind(this));
    this._arc._scheduler.registerIdleCallback(this.requestPlanning.bind(this));

    this.registerSuggestChangedCallback((suggestions) => this._arc.pec.slotComposer.setSuggestions(suggestions));
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
      this._arc.search = search;
      this.requestPlanning();
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
        suggestions = suggestions.filter(suggestion => suggestion.descriptionText.toLowerCase().includes(this.suggestFilter.search));
      } else {
        suggestions = suggestions.filter(suggestion => !suggestion.plan.slots.find(s => s.name.includes('root') || s.tags.includes('#root')));
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

  onPlanInstantiated(plan) {
    // Check that plan is in this._current.plans;
    if (!this._current.plans.find(currentPlan => currentPlan.plan == plan)) {
      assert(false, `The plan being instantiated (${plan.description}) doesn't appear in the current list of plans`);
    }
    // Move current to past, and clear current;
    this._past = {plan, plans: this._current.plans, generations: this._current.generations};
    this._setCurrent({plans: [], generations: []});
    this.requestPlanning();
  }

  requestPlanning(event) {
    // Activate replanning and trigger subscribed callbacks.
    return this._schedulePlanning();
  }

  async _schedulePlanning(timeout) {
    this._valid = false;
    let results;
    if (!this.isPlanning) {
      this.isPlanning = true;
      try {
        await this._runPlanning(timeout);
      } catch (x) {
        console.error(x);
      }
      this.isPlanning = false;
      this._setCurrent({plans: this._next.plans, generations: this._next.generations});
    }
  }

  async _runPlanning(timeout) {
    let time = Date.now();
    while (!this._valid) {
      this._valid = true;
      await this._doNextPlans(timeout);
    }
    time = ((Date.now() - time) / 1000).toFixed(2);
    console.log(`Produced ${this._next.plans.length} in ${time}s.`);
  }

  _plansDiffer(newPlans, oldPlans) {
    return !oldPlans ||
        oldPlans.length !== newPlans.length ||
        oldPlans.some((s, i) => newPlans[i].hash !== s.hash || newPlans[i].descriptionText != s.descriptionText);
  }

  async _doNextPlans(timeout) {
    this._next = {generations: []};
    let planner = new Planner();
    planner.init(this._arc);
    this._next.plans = await planner.suggest(timeout || defaultTimeoutMs, this._next.generations);
  }

  _setCurrent(current) {
    if (this._plansDiffer(current.plans, this._current.plans)) {
      let previousSuggestions = this.getCurrentSuggestions();
      this._current = current;
      this._plansChangedCallbacks.forEach(callback => callback(this._current));
      let suggestions = this.getCurrentSuggestions();
      if (this._plansDiffer(suggestions, previousSuggestions)) {
        this._suggestChangedCallbacks.forEach(callback => callback(suggestions));
      }
    }
  }
}
