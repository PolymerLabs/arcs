// Copyright (c) 2018 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

import {assert} from '../../../platform/assert-web.js';
import {Arc} from '../arc';
import {now} from '../../../platform/date-web.js';
import {PlanConsumer} from './plan-consumer';
import {PlanProducer} from './plan-producer';
import {Schema} from '../schema';
import {SuggestionComposer} from '../../suggestion-composer.js';
import {Type} from '../type';

export class Planificator {
  static async create(arc, {userid, protocol}) {
    const store = await Planificator._initStore(arc, {userid, protocol});
    const planificator = new Planificator(arc, store);
    return planificator;
  }

  arc: Arc;
  consumer: PlanConsumer;
  producer: PlanProducer;
  search: string|null = null;
  suggestionComposer: SuggestionComposer|null = null;

  constructor(arc, store) {
    this.arc = arc;
    this.producer = new PlanProducer(arc, store);
    this.consumer = new PlanConsumer(arc, store);

    // create suggestion composer and register for a callback.
    const composer = arc.pec.slotComposer;
    if (composer) {
      if (composer.findContextById('rootslotid-suggestions')) {
        this.suggestionComposer = new SuggestionComposer(composer);
        this.registerSuggestChangedCallback((suggestions) => this.suggestionComposer.setSuggestions(suggestions));
      }
    }
  }

  async requestPlanning(options) {
    await this.producer.runPlanner(options);
  }

  setSearch(search) {
    search = search ? search.toLowerCase().trim() : null;
    search = (search !== '') ? search : null;
    if (this.search !== search) {
      this.search = search;
      const showAll = this.search === '*';
      const filter = showAll ? null : this.search;
      this.consumer.setSuggestFilter(showAll, filter);
    }
  }

  registerPlansChangedCallback(callback) { this.consumer.plansChangeCallbacks.push(callback); }
  registerSuggestChangedCallback(callback) { this.consumer.suggestionsChangeCallbacks.push(callback); }

  dispose() {
    this.consumer.dispose();
  }

  static async _initStore(arc, {userid, protocol}) {
    assert(userid, 'Missing user id.');
    let storage = arc.storageProviderFactory._storageForKey(arc.storageKey);
    const storageKey = storage.parseStringAsKey(arc.storageKey);
    if (protocol) {
      storageKey.protocol = protocol;
    }
    storageKey.location = storageKey.location.replace('/arcs/', `/users/${userid}/suggestions/`);
    const storageKeyStr = storageKey.toString();
    storage = arc.storageProviderFactory._storageForKey(storageKeyStr);
    const schema = new Schema({names: ['Suggestions'], fields: {current: 'Object'}});
    const type = Type.newEntity(schema);

    // TODO: unify initialization of suggestions storage.
    const id = 'suggestions-id';
    let store = null;
    switch (storageKey.protocol) {
      case 'firebase':
        return storage._join(id, type, storageKeyStr, /* shoudExist= */ 'unknown', /* referenceMode= */ false);
      case 'volatile':
        try {
          store = await storage.construct(id, type, storageKeyStr);
        } catch(e) {
          store = await storage.connect(id, type, storageKeyStr);
        }
        assert(store, `Failed initializing '${protocol}' store.`);
        store.referenceMode = false;
        return store;
      case 'pouchdb':
        store = storage.construct(id, type, storageKeyStr);
        assert(store, `Failed initializing '${protocol}' store.`);
        store.referenceMode = false;
        return store;
      default:
        assert(false, `Unsupported protocol '${protocol}'`);
    }
  }
}
