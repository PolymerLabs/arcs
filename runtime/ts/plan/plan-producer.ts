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
  _isPlanning: boolean;
  stateChangedCallbacks: ((isPlanning: boolean) => void)[] = [];

  constructor(arc: Arc, store: StorageProviderBase) {
    assert(arc, 'arc cannot be null');
    assert(store, 'store cannot be null');
    this.arc = arc;
    this.result = new PlanningResult(arc);
    this.store = store;
    this.speculator = new Speculator();
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

  async producePlans(options = {}) {
    if (options['cancelOngoingPlanning'] && this.isPlanning) {
      this._cancelPlanning();
    }

    this.needReplan = true;
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
      plans = await this.runPlanner(options, generations);
    }
    time = ((now() - time) / 1000).toFixed(2);

    // Plans are null, if planning was cancelled.
    if (plans) {
      console.log(`Produced ${plans.length}${options['append'] ? ' additional' : ''} plans [elapsed=${time}s].`);
      this.isPlanning = false;
      await this._updateResult({plans, generations}, options);
    }
  }

  async runPlanner(options, generations) {
    let plans = [];
    assert(!this.planner, 'Planner must be null');
    this.planner = new Planner();
    this.planner.init(this.arc, {
      strategies: options['strategies']
      // TODO: add `search` and `contextual` params.
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
      if (!this.result.append({plans, generations})) {
        return;
      }
    } else {
      if (!this.result.set({plans, generations})) {
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
