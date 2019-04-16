/**
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {logFactory} from '../../../../build/platform/log-web.js';
import {forEachEntity, listenToStore} from './context-utils.js';

// sanity check
let observers = 0;

export class StoreObserver {
  constructor(store, listener, owner) {
    observers++;
    this.store = store;
    this.listener = listener;
    this.owner = owner;
    this.log = logFactory('StoreObserver', 'orange');
    // prepare ready promise
    this.ready = new Promise(resolve => this._resolveReady = resolve);
    // TODO(sjmiles): connecting is async, beware race-condition vs. dispose()
    // dispose should await a ready condition
    this._connect(store);
  }
  async _connect(store, resolveReady) {
    // observe addition of all entities
    await simulateInitialChanges(store, change => this.onChange(change));
    // observe future changes (and record ability to stop observation)
    this.off = listenToStore(store, change => this.onChange(change));
    // notify that connection is ready
    this._resolveReady();
  }
  async dispose() {
    // sanity check
    if (--observers === 0) {
      console.warn(`all observers disposed (generally a good thing)`);
    }
    // stop observing store
    this.off();
    // observe removal of all entities
    await forEachEntity(this.store, value => this.remove(value));
  }
  async onChange(change) {
    //this.log('onChange', change);
    const {add, remove, data} = change;
    if (data) {
      // TODO(sjmiles): strip off version indicator (kosher?)
      //data.id = data.id.split(':').slice(0, -1).join(':');
      //this.log('removed version tag from data.id', data.id);
      this.add(data);
    }
    if (add) {
      for (let i=0, record; (record=add[i]); i++) {
        await this.add(record.value);
      }
      //add.forEach(({value}) => this.add(value));
    }
    if (remove) {
      for (let i=0, record; (record=remove[i]); i++) {
        await this.remove(record.value);
      }
      //remove.forEach(({value}) => this.remove(value));
    }
  }
  async add(value) {
    await this.listener.add(value, this.store);
  }
  async remove(value) {
    await this.listener.remove(value, this.store);
  }
}

export const simulateInitialChanges = async (store, onchange) => {
  if (store.toList) {
    const data = await store.toList();
    const add = data.filter(value => Boolean(value)).map(value => ({value}));
    await onchange({add});
    //data.forEach(value => value && onchange(value));
  } else {
    const data = await store.get();
    await onchange({data});
  }
};
