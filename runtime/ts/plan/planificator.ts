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
import {PlanConsumer} from './plan-consumer';
import {PlanProducer} from './plan-producer';
import {Recipe} from '../recipe/recipe';
import {ReplanQueue} from './replan-queue';
import {Schema} from '../schema';
import {Type} from '../type';
import {StorageProviderBase} from "../storage/storage-provider-base.js";
import {StorageProviderFactory} from "../storage/storage-provider-factory";

export class Planificator {
  static async create(arc: Arc, {userid, storageKeyBase}) {
    const store = await Planificator._initStore(arc, {userid, storageKeyBase, arcKey: null});
    const planificator = new Planificator(arc, userid, store);
    planificator.requestPlanning();
    return planificator;
  }

  arc: Arc;
  userid: string;
  consumer: PlanConsumer;
  producer: PlanProducer;
  replanQueue: ReplanQueue;
  search: string|null = null;
  dataChangeCallback: () => void = () => this.replanQueue.addChange();

  // In <0.6 shell, this is needed to backward compatibility, in order to (1)
  // (1) trigger replanning with a local producer and (2) notify shell of the
  // last activated plan, to allow serialization.
  // TODO(mmandlis): Is this really needed in the >0.6 shell?
  arcCallback: ({}) => void = this._onPlanInstantiated.bind(this);
  lastActivatedPlan: Recipe|null;

  constructor(arc: Arc, userid: string, store: StorageProviderBase) {
    this.arc = arc;
    this.userid = userid;
    this.producer = new PlanProducer(arc, store);
    this.replanQueue = new ReplanQueue(this.producer);
    this.consumer = new PlanConsumer(arc, store);

    this.lastActivatedPlan = null;
    this.arc.registerInstantiatePlanCallback(this.arcCallback);
    this._listenToArcStores();
  }

  async requestPlanning(options = {}) {
    await this.producer.producePlans(options);
  }

  async loadPlans() {
    return this.consumer.loadPlans();
  }

  setSearch(search: string) {
    search = search ? search.toLowerCase().trim() : null;
    search = (search !== '') ? search : null;
    if (this.search !== search) {
      this.search = search;
      const showAll = this.search === '*';
      const filter = showAll ? null : this.search;
      this.consumer.setSuggestFilter(showAll, filter);
    }
  }

  registerPlansChangedCallback(callback) {
    this.consumer.registerPlansChangedCallback(callback);
  }

  registerSuggestChangedCallback(callback) {
    this.consumer.registerSuggestChangedCallback(callback);
  }

  dispose() {
    this.arc.unregisterInstantiatePlanCallback(this.arcCallback);
    this._unlistenToArcStores();
    this.producer.store.dispose();
    this.consumer.dispose();
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

  private static async _initStore(arc: Arc, {userid, storageKeyBase, arcKey}): Promise<StorageProviderBase> {
    assert(userid, 'Missing user id.');
    assert(storageKeyBase, 'Missing storageKeyBase');
    if (!arcKey) {
      arcKey = arc.id.toString();
    }

    // TODO evaluate how volatile keys expect to be in the form of volatile://$arcId/$location ...
    const storageKeyStr = `${storageKeyBase}/users/${userid}/suggestions/${arcKey}`;

    const storage = new StorageProviderFactory(arc.id);
    if (!storage) {
      throw new Error('Unable to find storage for ' + arc.id);
    }

    // storage = arc.storageProviderFactory._storageForKey(storageKeyStr);
    const schema = new Schema({names: ['Suggestions'], fields: {current: 'Object'}});
    const type = Type.newEntity(schema);
    assert(!type.isReference, 'type cannot be a reference');

    // TODO: unify initialization of suggestions storage.
    const id = 'suggestions-id';
    let store = null;
    try {
      store = await storage.construct(id, type, storageKeyStr);
    } catch (e) {
      store = await storage.connect(id, type, storageKeyStr);
    }
    assert(store, 'Failed initializing store.');
    store.referenceMode = false;
    return store;
  }

  isArcPopulated(): boolean {
    if (this.arc.recipes.length === 0) return false;
    if (this.arc.recipes.length === 1) {
      const [recipe] = this.arc.recipes;
      if (recipe.particles.length === 0 ||
          (recipe.particles.length === 1 && recipe.particles[0].name === 'Launcher')) {
        // TODO: Check for Launcher is hacky, find a better way.
        return false;
      }
    }
    return true;
  }
}
