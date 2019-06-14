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
import {Arc} from '../../runtime/arc.js';
import {Runnable} from '../../runtime/hot.js';
import {KeyBase} from '../../runtime/storage/key-base.js';
import {StorageProviderBase, SingletonStorageProvider} from '../../runtime/storage/storage-provider-base.js';
import {EntityType} from '../../runtime/type.js';
import {PlanConsumer} from './plan-consumer.js';
import {PlanProducer, Trigger} from './plan-producer.js';
import {PlanningResult} from './planning-result.js';
import {ReplanQueue} from './replan-queue.js';
import {PlannerInspector, PlannerInspectorFactory, InspectablePlanner} from '../planner-inspector.js';

const planificatorId = 'plans';

export type PlanificatorOptions = {
  storageKeyBase?: string;
  debug?: boolean;
  onlyConsumer?: boolean;
  inspectorFactory?: PlannerInspectorFactory;
};

export class Planificator {
  static async create(arc: Arc, {storageKeyBase, onlyConsumer, debug = false, inspectorFactory}: PlanificatorOptions) {
    debug = debug || (Boolean(storageKeyBase) && storageKeyBase.startsWith('volatile'));
    const store = await Planificator._initSuggestStore(arc, storageKeyBase) as SingletonStorageProvider;
    const searchStore = await Planificator._initSearchStore(arc);
    const result = new PlanningResult({context: arc.context, loader: arc.loader}, store);
    await result.load();
    const planificator = new Planificator(arc, result, searchStore, onlyConsumer, debug, inspectorFactory);
    await planificator._storeSearch(); // Reset search value for the current arc.
    await planificator.requestPlanning({contextual: true, metadata: {trigger: Trigger.Init}});
    return planificator;
  }

  readonly arc: Arc;
  result: PlanningResult;
  consumer: PlanConsumer;
  producer?: PlanProducer;
  replanQueue?: ReplanQueue;
  dataChangeCallback: Runnable;
  search: string|null = null;
  searchStore: SingletonStorageProvider;
  inspector: PlannerInspector|undefined;

  constructor(arc: Arc, result: PlanningResult, searchStore: SingletonStorageProvider, onlyConsumer: boolean = false, debug: boolean = false, inspectorFactory?: PlannerInspectorFactory) {
    this.arc = arc;
    this.searchStore = searchStore;
    if (inspectorFactory) {
      this.inspector = inspectorFactory.create(this);
    }
    assert(result, 'Result cannot be null.');
    this.result = result;
    if (!onlyConsumer) {
      this.producer = new PlanProducer(this.arc, this.result, searchStore, this.inspector, {debug});
      this.replanQueue = new ReplanQueue(this.producer);
      this.dataChangeCallback = () => this.replanQueue.addChange();
      this._listenToArcStores();
    }
    this.consumer = new PlanConsumer(this.arc, this.result, this.inspector);
  }

  async forceReplan() {
    this.consumer.result.suggestions = [];
    this.consumer.result.generations = [];
    await this.consumer.result.flush();
    await this.requestPlanning({metadata: {trigger: Trigger.Forced}});
    await this.loadSuggestions();
  }

  async requestPlanning(options = {}) {
    if (!this.consumerOnly && this.producer) {
      await this.producer.produceSuggestions(options);
    }
  }

  get consumerOnly(): boolean { return !this.producer; }

  async loadSuggestions() {
    return this.result.load();
  }

  async setSearch(search: string|null) {
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
    if (!this.consumerOnly) {
      this._unlistenToArcStores();
      if (this.producer) {
        this.producer.dispose();
      }
    }
    this.consumer.dispose();
    this.result.dispose();
  }

  async deleteAll() {
    if (this.producer) {
      await this.producer.result.clear();
    }
    await this.setSearch(null);
  }

  private _listenToArcStores() {
    this.arc.onDataChange(this.dataChangeCallback, this);
    this.arc.context.allStores.forEach(store => {
      if (store instanceof StorageProviderBase) {
        store.on('change', this.dataChangeCallback, this);
      }
    });
  }

  private _unlistenToArcStores() {
    this.arc.clearDataChange(this);
    this.arc.context.allStores.forEach(store => {
      if (store instanceof StorageProviderBase) {
        store.off('change', this.dataChangeCallback);
      }
    });
  }

  static constructSuggestionKey(arc: Arc, storageKeyBase?: string): KeyBase {
    const arcStorageKey = arc.storageProviderFactory.parseStringAsKey(arc.storageKey);
    const keybase = arc.storageProviderFactory.parseStringAsKey(storageKeyBase || arcStorageKey.base());
    return keybase.childKeyForSuggestions(planificatorId, arcStorageKey.arcId);
  }

  static constructSearchKey(arc: Arc): KeyBase {
    const arcStorageKey = arc.storageProviderFactory.parseStringAsKey(arc.storageKey);
    const keybase = arc.storageProviderFactory.parseStringAsKey(arcStorageKey.base());
    return keybase.childKeyForSearch(planificatorId);
}

  private static async _initSuggestStore(arc: Arc, storageKeyBase?: string): Promise<SingletonStorageProvider> {
    const storageKey = Planificator.constructSuggestionKey(arc, storageKeyBase);
    return Planificator._initStore(
        arc, 'suggestions-id', EntityType.make(['Suggestions'], {current: 'Object'}), storageKey);
  }

  private static async _initSearchStore(arc: Arc): Promise<SingletonStorageProvider> {
    const storageKey = Planificator.constructSearchKey(arc);
    return Planificator._initStore(
        arc, 'search-id', EntityType.make(['Search'], {current: 'Object'}), storageKey);
  }

  private static async _initStore(arc: Arc, id: string, type: EntityType, storageKey: KeyBase) : Promise<SingletonStorageProvider> {
    const store = await arc.storageProviderFactory.connectOrConstruct(id, type, storageKey.toString());
    assert(store, `Failed initializing '${storageKey.toString()}' store.`);
    store.referenceMode = false;
    return store as SingletonStorageProvider;
  }

  async _storeSearch(): Promise<void> {
    const values = await this.searchStore.get() || [];
    const arcKey = this.arc.id.idTreeAsString();
    const newValues: {arc: string, search: string}[] = [];
    for (const {arc, search} of values) {
      if (arc === arcKey) {
        if (search === this.search) {
          return; // Unchanged search value for the current arc.
        }
      } else {
        newValues.push({arc, search});
      }
    }
    if (this.search) {
      newValues.push({search: this.search, arc: arcKey});
    }
    return this.searchStore.set(newValues);
  }
}
