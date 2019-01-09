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
import {PlanConsumer} from './plan-consumer.js';
import {PlanProducer} from './plan-producer.js';
import {PlanningResult} from './planning-result.js';
import {Recipe} from '../recipe/recipe.js';
import {ReplanQueue} from './replan-queue.js';
import {KeyBase} from "../storage/key-base.js";
import {StorageProviderBase, VariableStorageProvider} from "../storage/storage-provider-base.js";
import {EntityType} from '../type.js';

export type PlanificatorOptions = {
  userid: string;
  storageKeyBase?: string;
  debug?: boolean;
  onlyConsumer?: boolean;
};

export class Planificator {
  static async create(arc: Arc, {userid, storageKeyBase, onlyConsumer, debug = false}: PlanificatorOptions) {
    assert(arc, 'Arc cannot be null.');
    assert(userid, 'User id cannot be null.');

    debug = debug || (storageKeyBase && storageKeyBase.startsWith('volatile'));
    const store = await Planificator._initSuggestStore(arc, userid, storageKeyBase) as VariableStorageProvider;
    const searchStore = await Planificator._initSearchStore(arc, userid);
    const planificator = new Planificator(arc, userid, store, searchStore, onlyConsumer, debug);
    await planificator.loadSuggestions();
    planificator.requestPlanning({contextual: true});
    return planificator;
  }

  arc: Arc;
  userid: string;
  result: PlanningResult;
  consumer: PlanConsumer;
  producer?: PlanProducer;
  replanQueue?: ReplanQueue;
  dataChangeCallback: () => void;
  search: string|null = null;
  searchStore: VariableStorageProvider;

  // In <0.6 shell, this is needed to backward compatibility, in order to (1)
  // (1) trigger replanning with a local producer and (2) notify shell of the
  // last activated plan, to allow serialization.
  // TODO(mmandlis): Is this really needed in the >0.6 shell?
  arcCallback: ({}) => void = this._onPlanInstantiated.bind(this);
  lastActivatedPlan: Recipe|null;

  constructor(arc: Arc, userid: string, store: VariableStorageProvider, searchStore: VariableStorageProvider, onlyConsumer: boolean = false, debug: boolean = false) {
    this.arc = arc;
    this.userid = userid;
    this.searchStore = searchStore;
    this.result = new PlanningResult(store);
    if (!onlyConsumer) {
      this.producer = new PlanProducer(this.arc, this.result, searchStore, {debug, blockDevtools: true /* handled by consumer */});
      this.replanQueue = new ReplanQueue(this.producer);
      this.dataChangeCallback = () => this.replanQueue.addChange();
      this._listenToArcStores();
    }
    this.consumer = new PlanConsumer(this.arc, this.result);

    this.lastActivatedPlan = null;
    this.arc.registerInstantiatePlanCallback(this.arcCallback);
  }

  async requestPlanning(options = {}) {
    if (!this.consumerOnly) {
      await this.producer.produceSuggestions(options);
    }
  }

  get consumerOnly() { return !Boolean(this.producer); }

  async loadSuggestions() {
    return this.result.load();
  }

  async setSearch(search: string) {
    search = search ? search.toLowerCase().trim() : null;
    search = (search !== '') ? search : null;
    if (this.search !== search) {
      this.search = search;

      await this._storeSearch();

      const showAll = this.search === '*';
      const filter = showAll ? null : this.search;
      this.consumer.setSuggestFilter(showAll, filter);
    }
  }

  registerSuggestionsChangedCallback(callback) {
    this.consumer.registerSuggestionsChangedCallback(callback);
  }

  registerVisibleSuggestionsChangedCallback(callback) {
    this.consumer.registerVisibleSuggestionsChangedCallback(callback);
  }

  dispose() {
    this.arc.unregisterInstantiatePlanCallback(this.arcCallback);
    if (!this.consumerOnly) {
      this._unlistenToArcStores();
      this.producer.dispose();
    }
    this.consumer.dispose();
    this.result.dispose();
  }

  async deleteAll() {
    await this.producer.result.clear();
    this.setSearch(null);
  }

  getLastActivatedPlan() {
    return {plan: this.lastActivatedPlan};
  }

  private _onPlanInstantiated(plan) {
    this.lastActivatedPlan = plan;
    this.requestPlanning();
  }

  private _listenToArcStores() {
    this.arc.onDataChange(this.dataChangeCallback, this);
    this.arc.context.allStores.forEach(store => {
      if (store.on) { // #2141: some are StorageStubs.
        store.on('change', this.dataChangeCallback, this);
      }
    });
  }

  private _unlistenToArcStores() {
    this.arc.clearDataChange(this);
    this.arc.context.allStores.forEach(store => {
      if (store.off) { // #2141: some are StorageStubs.
        store.off('change', this.dataChangeCallback);
      }
    });
  }

  static constructSuggestionKey(arc: Arc, userid: string, storageKeyBase?: string): KeyBase {
    const arcStorageKey = arc.storageProviderFactory.parseStringAsKey(arc.storageKey);
    const keybase = arc.storageProviderFactory.parseStringAsKey(storageKeyBase || arcStorageKey.base());
    return keybase.childKeyForSuggestions(userid, arcStorageKey.arcId);
  }

  static constructSearchKey(arc: Arc, userid: string): KeyBase {
    const arcStorageKey = arc.storageProviderFactory.parseStringAsKey(arc.storageKey);
    const keybase = arc.storageProviderFactory.parseStringAsKey(arcStorageKey.base());
    return keybase.childKeyForSearch(userid);
}

  private static async _initSuggestStore(arc: Arc, userid: string, storageKeyBase?: string): Promise<VariableStorageProvider> {
    const storageKey = Planificator.constructSuggestionKey(arc, userid, storageKeyBase);
    return Planificator._initStore(
        arc, 'suggestions-id', EntityType.make(['Suggestions'], {current: 'Object'}), storageKey);
  }

  private static async _initSearchStore(arc: Arc, userid: string): Promise<VariableStorageProvider> {
    const storageKey = Planificator.constructSearchKey(arc, userid);
    return Planificator._initStore(
        arc, 'search-id', EntityType.make(['Search'], {current: 'Object'}), storageKey);
  }

  private static async _initStore(arc: Arc, id: string, type: EntityType, storageKey: KeyBase) : Promise<VariableStorageProvider> {
    const store = await arc.storageProviderFactory.connectOrConstruct(id, type, storageKey.toString());
    assert(store, `Failed initializing '${storageKey.toString()}' store.`);
    store.referenceMode = false;
    return store as VariableStorageProvider;
  }

  async _storeSearch(): Promise<void> {
    const values = await this.searchStore.get() || [];
    const arcKey = this.arc.arcId;
    const newValues = [];
    for (const {arc, search} of values) {
      if (arc !== arcKey) {
        newValues.push({arc, search});
      }
    }
    if (this.search) {
      newValues.push({search: this.search, arc: arcKey});
    }
    return this.searchStore.set(newValues);
  }
}
