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
import {logsFactory} from '../../platform/logs-factory.js';
import {ArcInfo} from '../../runtime/arc-info.js';
import {Planner, Generation} from '../planner.js';
import {RecipeIndex} from '../recipe-index.js';
import {InitSearch} from '../strategies/init-search.js';
import {StrategyDerived} from '../strategizer.js';
import {PlanningResult} from './planning-result.js';
import {Suggestion} from './suggestion.js';
import {PlannerInspector} from '../planner-inspector.js';
import {ActiveSingletonEntityStore, SingletonEntityHandle} from '../../runtime/storage/storage.js';
import {Runtime} from '../../runtime/runtime.js';

const defaultTimeoutMs = 5000;

const {log} = logsFactory('PlanProducer', '#ff0090');

export enum Trigger {
  Init='init', Search='search', PlanInstantiated='plan-instantiated', DataChanged='data-changed', Forced='forced',
}
type SuggestionOptions = {
  cancelOngoingPlanning?: boolean,
  metadata?: { trigger: Trigger, search?: string},
  search?: string,
  strategies?: StrategyDerived[],
  contextual?: boolean
};

export class PlanProducer {
  planner: Planner|null = null;
  recipeIndex: RecipeIndex;
  needReplan = false;
  replanOptions: SuggestionOptions = {};
  _isPlanning = false;
  stateChangedCallbacks: ((isPlanning: boolean) => void)[] = [];
  search: string;
  searchStoreCallbackId: number;
  debug: boolean;
  noSpecEx: boolean;

  constructor(
    readonly arcInfo: ArcInfo,
    readonly runtime: Runtime,
    readonly result: PlanningResult,
    readonly searchStore?: ActiveSingletonEntityStore,
    readonly searchHandle?: SingletonEntityHandle,
    readonly inspector?: PlannerInspector,
    {debug = false, noSpecEx = false} = {}
  ) {
    assert(this.result, 'result cannot be null');
    assert(this.arcInfo, 'arcInfo cannot be null');
    this.recipeIndex = RecipeIndex.create(this.arcInfo);
    if (this.searchStore) {
      assert(this.searchHandle);
      this.searchStoreCallbackId = this.searchStore.on(() => this.onSearchChanged());
    }
    this.debug = debug;
    this.noSpecEx = noSpecEx;
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

  async onSearchChanged(): Promise<void> {
    const values = JSON.parse((await this.searchHandle.fetch()).current) || [];

    const arcId = this.arcInfo.id.idTreeAsString();
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
    const  options: SuggestionOptions = {
        // If we're searching but currently only have contextual suggestions,
        // we need get non-contextual suggestions as well.
        contextual: !this.result.contextual,
        metadata: {trigger: Trigger.Search, search: this.search}
      };
    if (this.search !== '*') { // Search for ALL (including non-contextual) suggestions.
      // Search by search term.
      options.cancelOngoingPlanning = this.result.suggestions.length > 0;
      options.search = this.search;
      if (options.contextual) {
        // If search changed and we already how all suggestions (i.e. including
        // non-contextual ones) then it's enough to initialize with InitSearch
        // with a new search phrase.
        options.strategies = [InitSearch, ...Planner.ResolutionStrategies];
      }
    }
    await this.produceSuggestions(options);
  }

  dispose() {
    if (this.searchStore) {
      this.searchStore.off(this.searchStoreCallbackId);
    }
  }

  async produceSuggestions(options: SuggestionOptions = {}) {
    if (options.cancelOngoingPlanning && this.isPlanning) {
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
      log(`[${this.arcInfo.id.idTreeAsString()}] Produced ${suggestions.length} suggestions [elapsed=${timestr}s].`);
      this.isPlanning = false;

      const serializedGenerations = this.debug ? PlanningResult.formatSerializableGenerations(generations) : [];
      if (this.result.merge({
          suggestions,
          generations: serializedGenerations,
          contextual: this.replanOptions.contextual}, this.arcInfo)) {
        // Store suggestions to store.
        await this.result.flush();

        if (this.inspector) this.inspector.updatePlanningResults(this.result, options.metadata);
      } else {
        // Add skipped result to devtools.
        if (this.inspector) {
          this.inspector.updatePlanningAttempt(suggestions, options.metadata);
          if (this.debug) this.inspector.strategizingRecord(serializedGenerations, {label: 'Plan Producer', keep: true});
        }
      }
    } else {  // Suggestions are null, if planning was cancelled.
      // Add cancelled attempt to devtools.
      if (this.inspector) this.inspector.updatePlanningAttempt(null, options.metadata);
    }
  }

  async runPlanner(options, generations: Generation[]): Promise<Suggestion[]> {
    let suggestions: Suggestion[] = [];
    assert(!this.planner, 'Planner must be null');
    this.planner = new Planner();
    this.planner.init(this.arcInfo, {
      runtime: this.runtime,
      strategies: options.strategies,
      strategyArgs: {
        contextual: options.contextual,
        search: options.search,
        recipeIndex: this.recipeIndex
      },
      noSpecEx: this.noSpecEx
    });

    suggestions = await this.planner.suggest(options.timeout || defaultTimeoutMs, generations);
    if (this.planner) {
      this.planner = null;
      return suggestions;
    }
    // Planning was cancelled.
    return null;
  }

  protected _cancelPlanning() {
    if (this.planner) {
      this.planner.dispose();
      this.planner = null;
    }
    this.needReplan = false;
    this.isPlanning = false; // using the setter method to trigger callbacks.
    log(`Cancel planning`);
  }
}
