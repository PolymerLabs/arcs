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
import {ArcInfo} from '../../runtime/arc-info.js';
import {Exists} from '../../runtime/storage/drivers/driver.js';
import {StorageKey} from '../../runtime/storage/storage-key.js';
import {checkDefined} from '../../runtime/testing/preconditions.js';
import {EntityType, SingletonType, Type} from '../../types/lib-types.js';
import {PlannerInspector, PlannerInspectorFactory} from '../planner-inspector.js';
import {PlanConsumer} from './plan-consumer.js';
import {PlanProducer, Trigger} from './plan-producer.js';
import {PlanningResult} from './planning-result.js';
import {ReplanQueue} from './replan-queue.js';
import {ActiveSingletonEntityStore, CRDTEntitySingleton, SingletonEntityHandle} from '../../runtime/storage/storage.js';
import {StoreInfo} from '../../runtime/storage/store-info.js';
import {CRDTTypeRecord} from '../../crdt/lib-crdt.js';
import {ActiveStore} from '../../runtime/storage/active-store.js';
import {Runtime} from '../../runtime/runtime.js';
import {StorageService} from '../../runtime/storage/storage-service.js';

const planificatorId = 'plans';

export type PlanificatorOptions = {
  runtime: Runtime;
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
  static async create(arc: Arc, {storageKeyBase, runtime, onlyConsumer, debug = false, inspectorFactory, noSpecEx}: PlanificatorOptions) {
    debug = debug || (Boolean(storageKeyBase) && isVolatile(storageKeyBase));
    const store = await Planificator.initSuggestStore(storageKeyBase || arc.storageKey, runtime.storageService);
    const searchStore = await Planificator.initSearchStore(arc.storageKey, runtime.storageService);
    const result = new PlanningResult({context: runtime.context, loader: runtime.loader, storageService: runtime.storageService}, store);
    await result.load();

    const searchHandle = await runtime.host.handleForStoreInfo(searchStore.storeInfo, arc.arcInfo);
    const planificator = new Planificator(arc, runtime, result, searchStore, searchHandle,
      onlyConsumer, debug, inspectorFactory, noSpecEx);

    await planificator._storeSearch(); // Reset search value for the current arc.
    await planificator.requestPlanning({contextual: true, metadata: {trigger: Trigger.Init}});
    return planificator;
  }

  consumer: PlanConsumer;
  producer?: PlanProducer;
  replanQueue?: ReplanQueue;
  storeCallbackIds: Map<ActiveStore<CRDTTypeRecord>, number>;
  search: string|null = null;
  inspector: PlannerInspector|undefined;

  constructor(readonly arc: Arc,
    readonly runtime: Runtime,
    readonly result: PlanningResult,
    readonly searchStore: ActiveSingletonEntityStore,
    readonly searchHandle: SingletonEntityHandle,
    onlyConsumer: boolean = false,
    debug: boolean = false,
    inspectorFactory?: PlannerInspectorFactory,
    noSpecEx: boolean = false
  ) {
    if (inspectorFactory) {
      this.inspector = inspectorFactory.create(this);
    }
    this.result = checkDefined(result, 'Result cannot be null');
    if (!onlyConsumer) {
      this.producer = new PlanProducer(this.arc.arcInfo, this.runtime, this.result, searchStore, this.searchHandle, this.inspector, {debug, noSpecEx});
      this.replanQueue = new ReplanQueue(this.producer);
      this._listenToArcStores();
    }
    this.consumer = new PlanConsumer(this.arc.arcInfo, this.result, this.inspector);
  }

  async forceReplan() {
    this.consumer.result.suggestions = [];
    this.consumer.result.generations = [];
    await this.consumer.result.flush();
    await this.requestPlanning({metadata: {trigger: Trigger.Forced}});
    await this.loadSuggestions();
  }

  get arcInfo(): ArcInfo { return this.arc.arcInfo; }

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
    this.arc.onDataChange(() => this.replanQueue.addChange(), this);
    this.storeCallbackIds = new Map();
    this.arcInfo.context.allStores.forEach(async storeInfo => {
      const store = await this.runtime.storageService.getActiveStore(storeInfo);
      const callbackId = store.on(async () => this.replanQueue.addChange());
      this.storeCallbackIds.set(store, callbackId);
    });
  }

  private _unlistenToArcStores() {
    this.arc.clearDataChange(this);
    this.arcInfo.context.allStores.forEach(async storeInfo => {
      const store = await this.runtime.storageService.getActiveStore(storeInfo);
      const callbackId = this.storeCallbackIds.get(store);
      store.off(callbackId);
    });
  }

  static async initSuggestStore(storageKey: StorageKey, storageService: StorageService): Promise<ActiveSingletonEntityStore> {
    return Planificator._initStore(
      storageService,
      'suggestions-id',
      PlanningResult.suggestionEntityType,
      storageKey.childKeyForSuggestions(planificatorId)
    );
  }

  static async initSearchStore(storageKey: StorageKey, storageService: StorageService): Promise<ActiveSingletonEntityStore> {
    return Planificator._initStore(
      storageService,
      'search-id',
      PlanningResult.suggestionEntityType,
      storageKey.childKeyForSearch(planificatorId)
    );
  }

  private static async _initStore(storageService: StorageService, id: string, type: EntityType, storageKey: StorageKey): Promise<ActiveSingletonEntityStore> {
    const singletonType = new SingletonType(type);
    return storageService.getActiveStore(new StoreInfo({storageKey, exists: Exists.MayExist, type: singletonType, id}));
  }

  async _storeSearch(): Promise<void> {
    const handleValue = await this.searchHandle.fetch();
    const values = handleValue ? JSON.parse(handleValue.current) : [];

    const arcKey = this.arcInfo.id.idTreeAsString();
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
    await this.searchHandle.setFromData({current: JSON.stringify(newValues)});
  }
}
