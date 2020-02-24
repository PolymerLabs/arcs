/**
 * @license
 * Copyright (c) 2018 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {Arc} from '../../runtime/arc.js';
import {Runnable} from '../../runtime/hot.js';
import {Exists} from '../../runtime/storageNG/drivers/driver.js';
import {StorageKey} from '../../runtime/storageNG/storage-key.js';
import {Store} from '../../runtime/storageNG/store.js';
import {UnifiedStore} from '../../runtime/storageNG/unified-store.js';
import {checkDefined} from '../../runtime/testing/preconditions.js';
import {EntityType, SingletonType, Type} from '../../runtime/type.js';
import {PlannerInspector, PlannerInspectorFactory} from '../planner-inspector.js';
import {PlanConsumer} from './plan-consumer.js';
import {PlanProducer, Trigger} from './plan-producer.js';
import {PlanningResult} from './planning-result.js';
import {ReplanQueue} from './replan-queue.js';
import {ActiveSingletonEntityStore, CRDTReferenceableSingleton, singletonHandle, SingletonEntityHandle} from '../../runtime/storageNG/storage-ng.js';

const planificatorId = 'plans';

export type PlanificatorOptions = {
  storageKeyBase?: StorageKey;
  debug?: boolean;
  onlyConsumer?: boolean;
  inspectorFactory?: PlannerInspectorFactory;
  noSpecEx?: boolean;
};

function isVolatile(key: string|StorageKey): boolean {
  if (typeof key === 'string') {
    return key.startsWith('volatile');
  }
  if (key instanceof StorageKey) {
    return key.protocol === 'volatile';
  }
  return false;
}

export class Planificator {
  // Hack: we use an entity with a single text field to store the json representation of a search.
  static searchEntityType = EntityType.make(['Search'], {current: 'Text'});
  static async create(arc: Arc, {storageKeyBase, onlyConsumer, debug = false, inspectorFactory, noSpecEx}: PlanificatorOptions) {
    debug = debug || (Boolean(storageKeyBase) && isVolatile(storageKeyBase));
    const store = await Planificator._initSuggestStore(arc, storageKeyBase);
    const searchStore = await Planificator._initSearchStore(arc);
    const result = new PlanningResult({context: arc.context, loader: arc.loader}, store);
    await result.load();
    const planificator = new Planificator(arc, result, searchStore, onlyConsumer, debug, inspectorFactory, noSpecEx);
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
  storeCallbackIds: Map<UnifiedStore, number>;
  search: string|null = null;
  searchStore: ActiveSingletonEntityStore;
  inspector: PlannerInspector|undefined;
  noSpecEx: boolean;

  constructor(arc: Arc, result: PlanningResult, searchStore: ActiveSingletonEntityStore, onlyConsumer: boolean = false, debug: boolean = false, inspectorFactory?: PlannerInspectorFactory, noSpecEx: boolean = false) {
    this.arc = arc;
    this.searchStore = searchStore;
    this.noSpecEx = noSpecEx;
    if (inspectorFactory) {
      this.inspector = inspectorFactory.create(this);
    }
    this.result = checkDefined(result, 'Result cannot be null');
    if (!onlyConsumer) {
      this.producer = new PlanProducer(this.arc, this.result, searchStore, this.inspector, {debug, noSpecEx});
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
    this.storeCallbackIds = new Map();
    this.arc.context.allStores.forEach(async store => {
      const callbackId = (await store.activate()).on(async () => {
        this.replanQueue.addChange();
        return true;
      });
      this.storeCallbackIds.set(store, callbackId);
    });
  }

  private _unlistenToArcStores() {
    this.arc.clearDataChange(this);
    this.arc.context.allStores.forEach(async store => {
      const callbackId = this.storeCallbackIds.get(store);
      (await store.activate()).off(callbackId);
    });
  }

  static constructSuggestionKey(arc: Arc, storageKeyBase?: StorageKey): StorageKey {
    const keybase = storageKeyBase || arc.storageKey;
    return keybase.childKeyForSuggestions(planificatorId);
  }

  static constructSearchKey(arc: Arc): StorageKey {
    return arc.storageKey.childKeyForSearch(planificatorId);
  }

  private static async _initSuggestStore(arc: Arc, storageKeyBase?: StorageKey): Promise<ActiveSingletonEntityStore> {
    const storageKey = Planificator.constructSuggestionKey(arc, storageKeyBase);
    return Planificator._initStore(arc, 'suggestions-id', PlanningResult.suggestionEntityType, storageKey);
  }

  private static async _initSearchStore(arc: Arc): Promise<ActiveSingletonEntityStore> {
    const storageKey = Planificator.constructSearchKey(arc);
    return Planificator._initStore(arc, 'search-id', PlanningResult.suggestionEntityType, storageKey);
  }

  private static async _initStore(arc: Arc, id: string, type: Type, storageKey: StorageKey): Promise<ActiveSingletonEntityStore> {
    return new Store<CRDTReferenceableSingleton>({storageKey, exists: Exists.MayExist, type: new SingletonType(type), id}).activate();
  }

  async _storeSearch(): Promise<void> {
    const handleNG: SingletonEntityHandle = singletonHandle(this.searchStore, this.arc);
    const handleValue = await handleNG.fetch();
    const values = handleValue ? JSON.parse(handleValue.current) : [];

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
    await handleNG.setFromData({current: JSON.stringify(newValues)});
  }
}
