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
import {Arc} from '../arc.js';
import {InitSearch} from '../strategies/init-search.js';
import {logFactory} from '../../platform/log-web.js';
import {now} from '../../platform/date-web.js';
import {Planner} from '../planner.js';
import {PlanningResult} from './planning-result.js';
import {RecipeIndex} from '../recipe-index.js';
import {Speculator} from '../speculator.js';
import {Suggestion} from './suggestion.js';
import {VariableStorageProvider} from '../storage/storage-provider-base.js';
import {StrategyDerived} from '../../planning/strategizer.js';

const defaultTimeoutMs = 5000;

const log = logFactory('PlanProducer', '#ff0090', 'log');
const error = logFactory('PlanProducer', '#ff0090', 'error');

export class PlanProducer {
  arc: Arc;
  result: PlanningResult;
  planner: Planner|null = null;
  recipeIndex: RecipeIndex;
  speculator: Speculator;
  needReplan: boolean;
  replanOptions: {};
  _isPlanning: boolean;
  stateChangedCallbacks: ((isPlanning: boolean) => void)[] = [];
  search: string;
  searchStore?: VariableStorageProvider;
  searchStoreCallback: ({}) => void;
  debug = false;

  constructor(arc: Arc, result: PlanningResult, searchStore?: VariableStorageProvider, {debug = false} = {}) {
    assert(result, 'result cannot be null');                
    assert(arc, 'arc cannot be null');
    this.arc = arc;
    this.result = result;
    this.recipeIndex = RecipeIndex.create(this.arc);
    this.speculator = new Speculator(this.result);
    this.searchStore = searchStore;
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
    const arcId = this.arc.arcId;
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
    if (this.search === '*') { // Search for ALL (including non-contextual) suggestions.
      if (this.result.contextual) {
        this.produceSuggestions({contextual: false});
      }
    } else { // Search by search term.
      const options: {cancelOngoingPlanning: boolean,
      search: string,
      strategies?: StrategyDerived[],
      append?: boolean,
      contextual?: boolean} = {
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
        options.append = true;
        options.strategies = [InitSearch, ...Planner.ResolutionStrategies];
      }

      this.produceSuggestions(options);
    }
  }

  dispose() {
    this.searchStore.off('change', this.searchStoreCallback);
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

    let time = now();

    let suggestions = [];
    let generations = [];
    while (this.needReplan) {
      this.needReplan = false;
      generations = [];
      suggestions = await this.runPlanner(this.replanOptions, generations);
    }
    time = ((now() - time) / 1000).toFixed(2);

    // Suggestions are null, if planning was cancelled.
    if (suggestions) {
      log(`[${this.arc.arcId}] Produced ${suggestions.length}${this.replanOptions['append'] ? ' additional' : ''} suggestions [elapsed=${time}s].`);
      this.isPlanning = false;

      await this._updateResult({suggestions, generations: this.debug ? generations : []}, this.replanOptions);
    }
  }

  async runPlanner(options, generations): Promise<Suggestion[]> {
    let suggestions = [];
    assert(!this.planner, 'Planner must be null');
    this.planner = new Planner();
    this.planner.init(this.arc, {
      strategies: options['strategies'],
      strategyArgs: {
        contextual: options['contextual'],
        search: options['search'],
        recipeIndex: this.recipeIndex
      }
    });

    suggestions = await this.planner.suggest(options['timeout'] || defaultTimeoutMs, generations, this.speculator);
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

  private async _updateResult({suggestions, generations}, options) {
    generations = PlanningResult.formatSerializableGenerations(generations);
    if (options.append) {
      assert(!options['contextual'], `Cannot append to contextual options`);
      if (!this.result.append({suggestions, generations})) {
        return;
      }
    } else {
      if (!this.result.merge({suggestions, generations, contextual: options['contextual']}, this.arc)) {
        return;
      }
    }
    // Store suggestions to store.
    await this.result.flush();
  }
}
