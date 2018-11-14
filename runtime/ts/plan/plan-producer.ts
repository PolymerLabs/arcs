/**
 * @license
 * Copyright (c) 2018 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {assert} from '../../../platform/assert-web.js';
import {Arc} from '../arc';
import {InitSearch} from '../../strategies/init-search.js';
import {now} from '../../../platform/date-web.js';
import {Planner} from '../planner.js';
import {PlanningResult} from './planning-result.js';
import {Speculator} from '../speculator';
import {StorageProviderBase} from '../storage/storage-provider-base';

const defaultTimeoutMs = 5000;

export class PlanProducer {
  arc: Arc;
  result: PlanningResult;
  store: StorageProviderBase;
  planner: Planner|null = null;
  speculator: Speculator;
  needReplan: boolean;
  replanOptions: {};
  _isPlanning: boolean;
  stateChangedCallbacks: ((isPlanning: boolean) => void)[] = [];
  search: string;
  searchStore: StorageProviderBase;
  searchStoreCallback: ({}) => void;

  constructor(arc: Arc, store: StorageProviderBase, searchStore: StorageProviderBase) {
    assert(arc, 'arc cannot be null');
    assert(store, 'store cannot be null');
    this.arc = arc;
    this.result = new PlanningResult(arc);
    this.store = store;
    this.speculator = new Speculator();
    this.searchStore = searchStore;
    if (this.searchStore) {
      this.searchStoreCallback = () => this.onSearchChanged();
      this.searchStore.on('change', this.searchStoreCallback, this);
    }
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
    const values = await this.searchStore['get']() || [];
    const value = values.find(value => value.arc === this.arcKey);
    if (!value) {
      return;
    }
    if (value.search === this.search) {
      return;
    }
    this.search = value.search;
    if (!this.search) {
      // search string turned empty, no need to replan, going back to contextual plans.
      return;
    }
    if (this.search === '*') { // Search for ALL (including non-contextual) plans.
      if (this.result.contextual) {
        this.producePlans({contextual: false});
      }
    } else { // Search by search term.
      const options = {
        cancelOngoingPlanning: this.result.plans.length > 0,
        search: this.search
      };
      if (this.result.contextual) {
        // If we're searching but currently only have contextual plans,
        // we need get non-contextual plans as well.
        Object.assign(options, {contextual: false});
      } else {
        // If search changed and we already how all plans (i.e. including
        // non-contextual ones) then it's enough to initialize with InitSearch
        // with a new search phrase.
        Object.assign(options, {
          strategies: [InitSearch].concat(Planner.ResolutionStrategies),
          append: true
        });
      }

      this.producePlans(options);
    }
  }

  get arcKey(): string {
    // TODO: this is a duplicate method of one in planificator.ts, refactor?
    return this.arc.storageKey.substring(this.arc.storageKey.lastIndexOf('/') + 1);
  }

  dispose() {
    this.searchStore.off('change', this.searchStoreCallback);
  }

  async producePlans(options = {}) {
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

    let plans = [];
    let generations = [];
    while (this.needReplan) {
      this.needReplan = false;
      generations = [];
      plans = await this.runPlanner(this.replanOptions, generations);
    }
    time = ((now() - time) / 1000).toFixed(2);

    // Plans are null, if planning was cancelled.
    if (plans) {
      console.log(`Produced ${plans.length}${this.replanOptions['append'] ? ' additional' : ''} plans [elapsed=${time}s].`);
      this.isPlanning = false;
      await this._updateResult({plans, generations}, this.replanOptions);
    }
  }

  async runPlanner(options, generations) {
    let plans = [];
    assert(!this.planner, 'Planner must be null');
    this.planner = new Planner();
    this.planner.init(this.arc, {
      strategies: options['strategies'],
      strategyArgs: {
        contextual: options['contextual'],
        search: options['search']
      }
    });

    plans = await this.planner.suggest(options['timeout'] || defaultTimeoutMs, generations, this.speculator);
    if (this.planner) {
      this.planner = null;
      return plans;
    }
    // Planning was cancelled.
    return null;
  }

  private _cancelPlanning() {
    if (this.planner) {
      this.planner.dispose();
      this.planner = null;
    }
    this.needReplan = false;
    this.isPlanning = false; // using the setter method to trigger callbacks.
    console.log(`Cancel planning`);
  }

  private async _updateResult({plans, generations}, options) {
    if (options.append) {
      assert(!options['contextual'], `Cannot append to contextual options`);
      if (!this.result.append({plans, generations})) {
        return;
      }
    } else {
      if (!this.result.set({plans, generations, contextual: options['contextual']})) {
        return;
      }
    }
    // Store plans to store.
    try {
      assert(this.store['set'], 'Unsupported setter in suggestion storage');
      await this.store['set'](this.result.serialize());
    } catch(e) {
      console.error('Failed storing suggestions: ', e);
      throw e;
    }
  }
}
