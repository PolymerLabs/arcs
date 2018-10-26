// Copyright (c) 2018 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

// Deprecated.
// TODO: Replace by ts/planificator.ts

import {assert} from '../platform/assert-web.js';
import {now} from '../platform/date-web.js';
import {InitSearch} from './strategies/init-search.js';
import {logFactory} from '../platform/log-web.js';
import {Planner} from './planner.js';
import {Speculator} from './ts-build/speculator.js';
import {SuggestionComposer} from './suggestion-composer.js';
import {SuggestionStorage} from './suggestion-storage.js';

const defaultTimeoutMs = 5000;

const log = logFactory('Planificator', '#ff0090', 'log');
const error = logFactory('Planificator', '#ff0090', 'error');

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
      const timeNow = now();
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
    const now = this._changes[this._changes.length - 1];
    const sincePrevChangeMs = now - this._changes[this._changes.length - 2];
    const sinceFirstChangeMs = now - this._changes[0];
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

const PlanningMode = {
  // The original mode where suggestions are produced and consumed locally.
  full: 'full',
  // Consumes suggestions and suggestion updates from a storage..
  // TODO: produce suggestions locally, if remotely produced ones not available for too long.
  consumer: 'consumer',
  // Monitors arc and context, produces suggestions and writes them into the storage.
  // TODO: Implement search / contextual support (currently simply all possible suggestions
  // are produced based on init-population).
  producer: 'producer'
};

const defaultOptions = {
  defaultReplanDelayMs: 200,
  maxNoReplanMs: 10000
};

export class Planificator {
  constructor(arc, options) {
    this._arc = arc;
    options = options || defaultOptions;
    this._userid = options.userid;
    this._mode = options.mode || PlanningMode.full;
    this._speculator = new Speculator();
    this._search = null;

    // The currently running Planner object.
    this._planner = null;
    // The latest results of a Planner session. These may become 'current', or be disposed as transient,
    // if a new replanning request came in during the Planner execution.
    this._next = {plans: [], generations: []}; // {plans, generations}
    // The current set plans to be presented to the user (full or subset)
    this._current = {plans: [], generations: []}; // {plans, generations}
    this._suggestFilter = {showAll: this.isProducer ? true : false};
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

    this._dataChangesQueue = new ReplanQueue(this, options);

    // Set up all callbacks that trigger re-planning.
    this._init();

    // Suggestion storage, used by planificator consumer & provider modes.
    this._storage = this._initSuggestionStorage();
  }

  _init() {
    this._arcCallback = this._onPlanInstantiated.bind(this);
    this._arc.registerInstantiatePlanCallback(this._arcCallback);
    if (this.isFull) {
      // TODO(mmandlis): Planificator subscribes to various change events.
      // Later, it will evaluate and batch events and trigger replanning intelligently.
      // Currently, just trigger replanning for each event.
      this._arc.onDataChange(() => this._onDataChange(), this);
      this._requestPlanning();
    }

    const composer = this._arc.pec.slotComposer;
    if (composer) {
      if (composer.findContextById('rootslotid-suggestions')) {
        const suggestionComposer = new SuggestionComposer(composer);
        this.registerSuggestChangedCallback((suggestions) => suggestionComposer.setSuggestions(suggestions));
      }
    }
  }

  _initSuggestionStorage() {
    if (this.isFull) {
      // suggestion storage isn't used in full mode, everything is stored in memory.
      return;
    }

    const suggestionStorage = new SuggestionStorage(this._arc, this.userid);
    if (this.isConsumer) {
      // Listen to suggestion-store updates, and update the `current` suggestions on change.
      suggestionStorage.registerSuggestionsUpdatedCallback(
          (current) => this._setCurrent(current, /* append= */false));
    }
    return suggestionStorage;
  }

  dispose() {
    // clear all callbacks the planificator has registered.
    this._arc.unregisterInstantiatePlanCallback(this._arcCallback);
    this._arc.clearDataChange(this);
    // clear all planificator's callbacks.
    this._plansChangedCallbacks = [];
    this._suggestChangedCallbacks = [];
    this._stateChangedCallbacks = [];
    if (this._storage) {
      this._storage.dispose();
      this._storage = null;
    }
  }

  get userid() { return this._userid; }
  get isFull() { return this._mode == PlanningMode.full; }
  get isConsumer() { return this._mode == PlanningMode.consumer; }
  get isProducer() { return this._mode == PlanningMode.producer; }

  get isPlanning() { return this._isPlanning; }
  set isPlanning(isPlanning) {
    if (this._isPlanning != isPlanning) {
      this._isPlanning = isPlanning;
      this._stateChangedCallbacks.forEach(callback => callback(this._isPlanning));
    }
  }
  get suggestFilter() { return this._suggestFilter; }
  set suggestFilter(suggestFilter) {
    // TODO: Implement search based decentralized planning.
    assert(!this.isProducer, `Cannot set suggest filter in producer mode`);

    assert(!suggestFilter.showAll || !suggestFilter.search);
    this._suggestFilter = suggestFilter;
  }

  setSearch(search) {
    // TODO: Implement search based decentralized planning.
    assert(!this.isProducer, `Cannot set search in producer mode`);

    search = search ? search.toLowerCase().trim() : null;
    search = (search !== '') ? search : null;
    const showAll = search === '*';
    search = showAll ? null : search;
    if (showAll == this.suggestFilter.showAll && search == this.suggestFilter.search) {
      return;
    }

    const previousSuggestions = this.getCurrentSuggestions();
    this.suggestFilter = {showAll, search};
    const suggestions = this.getCurrentSuggestions();

    if (this._plansDiffer(suggestions, previousSuggestions)) {
      this._suggestChangedCallbacks.forEach(callback => callback(suggestions));
    }

    const previousSearch = this._search;
    this._search = search;

    if (!this._current.contextual && (showAll || !search)) {
      // If we already have all results (i.e. not only contextual) and there is
      // no search term there is no need to replan: whatever search was before,
      // it was only affecting suggestions filters.
      return;
    }

    if (previousSearch !== search && !this._current.contextual) {
      // If search changed and we already how all plans (i.e. including
      // non-contextual ones) then it's enough to initialize with InitSearch
      // with a new search phrase.
      this._requestPlanning({
        cancelOngoingPlanning: this._current.plans.length > 0,
        strategies: [InitSearch].concat(Planner.ResolutionStrategies),
        append: true
      });
    } else if (this._current.contextual) {
      // Else if we're searching but currently only have contextual plans,
      // we need get non-contextual plans as well.
      this._requestPlanning({
        cancelOngoingPlanning: true,
        contextual: false
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
          const plan = suggestion.plan;
          const usesHandlesFromActiveRecipe = plan.handles.find(handle => {
            // TODO(mmandlis): find a generic way to exlude system handles (eg Theme), either by tagging or
            // by exploring connection directions etc.
            return !!handle.id && this._arc._activeRecipe.handles.find(activeHandle => activeHandle.id == handle.id);
          });
          const usesRemoteNonRootSlots = plan.slots.find(slot => {
            return !slot.name.includes('root') && !slot.tags.includes('root') && slot.id && !slot.id.includes('root');
          });
          const onlyUsesNonRootSlots = !plan.slots.find(s => s.name.includes('root') || s.tags.includes('root'));
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
    const planString = plan.toString();
    // Check that plan is in this._current.plans
    // TODO(mmandlis): re-enable this when the planner asynchrony doesn't cause it to be false.
    // assert(this._current.plans.some(currentPlan => currentPlan.plan.toString() == planString),
    //       `The instantiated plan (${plan.toString()}) doesn't appear in the current plans.`);

    // Move current to past, and clear current;
    this._past = {plan, plans: this._current.plans, generations: this._current.generations};
    this._setCurrent({plans: [], generations: [], contextual: true});
    this._requestPlanning({cancelOngoingPlanning: true, contextual: this._shouldRequestContextualPlanning()});
  }


  _onDataChange() {
    this._dataChangesQueue.addChange();
  }

  _requestPlanning(options) {
    if (this.isConsumer) {
      // Consumer-mode plannificator only consumes suggestions that are
      // produced and stored by producer-mode planificator.
      // TODO: Run planning locally, if no stored suggestions available.
      // TODO: set isPlanning to TRUE. Producer will update timestamp, then set isPlanning to false.
      return;
    }

    options = options || {
      contextual: this._shouldRequestContextualPlanning()
    };
    if (options.cancelOngoingPlanning && this.isPlanning) {
      this._cancelPlanning();
    }

    // Activate replanning and trigger subscribed callbacks.
    return this._schedulePlanning(options);
  }

  async _schedulePlanning(options) {
    this._valid = false;
    if (!this.isPlanning) {
      this.isPlanning = true;
      this._next = {generations: [], contextual: options.contextual};

      await this._runPlanning(options);

      this.isPlanning = false;
      await this._setCurrent(Object.assign({}, this._next), options.append || false);
    }
  }

  async _runPlanning(options) {
    let time = now();
    while (!this._valid) {
      this._valid = true;
      await this._doNextPlans({
        strategies: options.strategies,
        timeout: options.timeout,
        strategyArgs: {
          search: this._search,
          contextual: options.contextual
        }
      });
    }
    time = ((now() - time) / 1000).toFixed(2);

    if (this._next.plans) {
      // Can be null, if a new planning has already been scheduled.
      // TODO: this is a race condition, proper fix is part of #1620.
      log(`Produced ${this._next.plans.length}${options.append ? ' additional' : ''} plans [elapsed=${time}s].`);
    }
  }

  _cancelPlanning() {
    if (this._planner) {
      this._planner.dispose();
      this._planner = null;
    }
    this._next = {plans: [], generations: []};
    this.isPlanning = false; // using the setter method to trigger callbacks.
    this._valid = true;
    log(`Cancel planning`);
  }

  _plansDiffer(newPlans, oldPlans) {
    if (!newPlans) {
      // Ignore change, if new plans were removed by subsequent replanning (avoids race condition).
      return;
    }

    return !oldPlans ||
        oldPlans.length !== newPlans.length ||
        oldPlans.some(oldPlan => !newPlans.find(newPlan => newPlan.hash === oldPlan.hash && newPlan.descriptionText === oldPlan.descriptionText));
  }

  async _doNextPlans({strategies, strategyArgs, timeout = defaultTimeoutMs}) {
    this._planner = new Planner();
    this._planner.init(this._arc, {strategies, strategyArgs});
    this._next.plans = await this._planner.suggest(timeout, this._next.generations, this._speculator);
    this._planner = null;
  }

  async _setCurrent(current, append) {
    let hasChange = false;
    let newPlans = [];
    if (append) {
      newPlans = current.plans.filter(newPlan => !this._current.plans.find(currentPlan => currentPlan.hash == newPlan.hash));
      hasChange = newPlans.length > 0;
    } else {
      hasChange = this._plansDiffer(current.plans, this._current.plans);
    }

    if (hasChange) {
      const previousSuggestions = this.getCurrentSuggestions();
      if (append) {
        this._current.plans.push(...newPlans);
        this._current.generations.push(...current.generations);
      } else {
        this._current = current;
      }
      this._plansChangedCallbacks.forEach(callback => callback(this._current));
      const suggestions = this.getCurrentSuggestions();
      if (this._plansDiffer(suggestions, previousSuggestions)) {
        this._suggestChangedCallbacks.forEach(callback => callback(suggestions));
      }

      if (this.isProducer) {
        this._storage.storeCurrent(current);
      }
    } else {
      this._current.contextual = current.contextual;
      current.plans && console.log(`Plans were not updated (total: ${current.plans.length}, append: ${append})`);
    }
  }

  _shouldRequestContextualPlanning() {
    // If user is searching, request broad, non-contextual planning.
    if (this._suggestFilter.showAll || this._suggestFilter.search) return false;

    return this._isArcPopulated();
  }

  _isArcPopulated() {
    if (this._arc.recipes.length == 0) return false;
    if (this._arc.recipes.length == 1) {
      const [recipe] = this._arc.recipes;
      if (recipe.particles.length == 0 ||
          (recipe.particles.length == 1 && recipe.particles[0].name === 'Launcher')) {
        // TODO: Check for Launcher is hacky, find a better way.
        return false;
      }
    }
    return true;
  }
}
