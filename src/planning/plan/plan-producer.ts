/**
 * @license
 * Copyright (c) 2018 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {assert} from '../../platform/assert-web.js';
import {now} from '../../platform/date-web.js';
import {logFactory} from '../../platform/log-web.js';
import {Arc} from '../../runtime/arc.js';
import {SingletonStorageProvider} from '../../runtime/storage/storage-provider-base.js';
import {Planner, Generation} from '../planner.js';
import {RecipeIndex} from '../recipe-index.js';
import {Speculator} from '../speculator.js';
import {InitSearch} from '../strategies/init-search.js';
import {StrategyDerived} from '../strategizer.js';
import {PlanningResult} from './planning-result.js';
import {Suggestion} from './suggestion.js';
import {PlannerInspector} from '../planner-inspector.js';

const defaultTimeoutMs = 5000;

const log = logFactory('PlanProducer', '#ff0090', 'log');
const error = logFactory('PlanProducer', '#ff0090', 'error');

export enum Trigger {
  Init='init', Search='search', PlanInstantiated='plan-instantiated', DataChanged='data-changed', Forced='forced',
}

export class PlanProducer {
  arc: Arc;
  result: PlanningResult;
  planner: Planner|null = null;
  recipeIndex: RecipeIndex;
  speculator: Speculator;
  needReplan = false;
  replanOptions: {};
  _isPlanning = false;
  stateChangedCallbacks: ((isPlanning: boolean) => void)[] = [];
  search: string;
  searchStore?: SingletonStorageProvider;
  searchStoreCallback: ({}) => void;
  debug: boolean;
  inspector?: PlannerInspector;

  constructor(arc: Arc, result: PlanningResult, searchStore?: SingletonStorageProvider, inspector?: PlannerInspector, {debug = false} = {}) {
    assert(result, 'result cannot be null');                
    assert(arc, 'arc cannot be null');
    this.arc = arc;
    this.result = result;
    this.recipeIndex = RecipeIndex.create(this.arc);
    this.speculator = new Speculator();
    this.searchStore = searchStore;
    this.inspector = inspector;
    if (this.searchStore) {
      this.searchStoreCallback = () => this.onSearchChanged();
      this.searchStore.on('change', this.searchStoreCallback, this);
    }
    this.debug = debug;
  }

  get isPlanning() { return this._isPlanning; }
  set isPlanning(isPlanning) {
    if (this.isPlanning === isPlanning) {
      return;
    }
    this._isPlanning = isPlanning;
    this.stateChangedCallbacks.forEach(callback => callback(this.isPlanning));
  }

  registerStateChangedCallback(callback) {
    this.stateChangedCallbacks.push(callback);
  }

  async onSearchChanged() {
    const values = await this.searchStore.get() || [];
    const arcId = this.arc.id.idTreeAsString();
    const value = values.find(value => value.arc === arcId);
    if (!value) {
      return;
    }
    if (value.search === this.search) {
      return;
    }
    this.search = value.search;
    if (!this.search) {
      // search string turned empty, no need to replan, going back to contextual suggestions.
      return;
    }
    const metadata = {trigger: Trigger.Search, search: this.search};
    if (this.search === '*') { // Search for ALL (including non-contextual) suggestions.
      if (this.result.contextual) {
        await this.produceSuggestions({contextual: false, metadata});
      }
    } else { // Search by search term.
      const options: {
        cancelOngoingPlanning: boolean,
        search: string,
        strategies?: StrategyDerived[],
        contextual?: boolean
      } = {
        cancelOngoingPlanning: this.result.suggestions.length > 0,
        search: this.search
      };
      if (this.result.contextual) {
        // If we're searching but currently only have contextual suggestions,
        // we need get non-contextual suggestions as well.
        options.contextual = false;
      } else {
        // If search changed and we already how all suggestions (i.e. including
        // non-contextual ones) then it's enough to initialize with InitSearch
        // with a new search phrase.
        options.strategies = [InitSearch, ...Planner.ResolutionStrategies];
      }

      await this.produceSuggestions({...options, metadata});
    }
  }

  dispose() {
    if (this.searchStore) {
      this.searchStore.off('change', this.searchStoreCallback);
    }
  }

  async produceSuggestions(options = {}) {
    if (options['cancelOngoingPlanning'] && this.isPlanning) {
      this._cancelPlanning();
    }

    this.needReplan = true;
    this.replanOptions = options;
    if (this.isPlanning) {
      return;
    }
    this.isPlanning = true;

    const time = now();

    let suggestions: Suggestion[] = [];
    let generations: Generation[] = [];
    while (this.needReplan) {
      this.needReplan = false;
      generations = [];
      suggestions = await this.runPlanner(this.replanOptions, generations);
    }
    const timestr = ((now() - time) / 1000).toFixed(2);

    if (suggestions) {
      log(`[${this.arc.id.idTreeAsString()}] Produced ${suggestions.length} suggestions [elapsed=${timestr}s].`);
      this.isPlanning = false;

      const serializedGenerations = this.debug ? PlanningResult.formatSerializableGenerations(generations) : [];
      if (this.result.merge({
          suggestions,
          generations: serializedGenerations,
          contextual: this.replanOptions['contextual']}, this.arc)) {
        // Store suggestions to store.
        await this.result.flush();
        
        if (this.inspector) this.inspector.updatePlanningResults(this.result, options['metadata']);
      } else {
        // Add skipped result to devtools.
        if (this.inspector) {
          this.inspector.updatePlanningAttempt(suggestions, options['metadata']);
          if (this.debug) this.inspector.strategizingRecord(serializedGenerations, {label: 'Plan Producer', keep: true});
        }
      }
    } else {  // Suggestions are null, if planning was cancelled.
      // Add cancelled attempt to devtools.
      if (this.inspector) this.inspector.updatePlanningAttempt(null, options['metadata']);
    }
  }

  async runPlanner(options, generations: Generation[]): Promise<Suggestion[]> {
    let suggestions: Suggestion[] = [];
    assert(!this.planner, 'Planner must be null');
    this.planner = new Planner();
    this.planner.init(this.arc, {
      strategies: options['strategies'],
      strategyArgs: {
        contextual: options['contextual'],
        search: options['search'],
        recipeIndex: this.recipeIndex
      },
      speculator: this.speculator,
    });

    suggestions = await this.planner.suggest(options['timeout'] || defaultTimeoutMs, generations);
    if (this.planner) {
      this.planner = null;
      return suggestions;
    }
    // Planning was cancelled.
    return null;
  }

  protected _cancelPlanning() {
    if (this.planner) {
      this.planner = null;
    }
    this.speculator.dispose();
    this.needReplan = false;
    this.isPlanning = false; // using the setter method to trigger callbacks.
    log(`Cancel planning`);
  }
}
