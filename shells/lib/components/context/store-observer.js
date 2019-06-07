/**
 * @license
 * Copyright 2019 Google LLC.
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

// idle monitoring
let idlePromise;
let idleResolve;
let idleTimeout;
const idleDebounce = 500;

export class StoreObserver {
  static get idle() {
    return idlePromise;
  }
  static working() {
    clearTimeout(idleTimeout);
    if (!idlePromise) {
      idlePromise = new Promise(resolve => idleResolve = resolve);
    }
    idleTimeout = setTimeout(() => {
      idleResolve();
      idlePromise = null;
    }, idleDebounce);
  }
  constructor(store, listener, owner) {
    observers++;
    this.store = store;
    this.listener = listener;
    this.owner = owner;
    const type = store.type.tag === 'Handle' ? 'Handle' : store.type.getEntitySchema().names[0];
    this.log = logFactory(`StoreObserver::${type}`, `orange`);
    // prepare ready promise
    this.ready = new Promise(resolve => this._resolveReady = resolve);
    // TODO(sjmiles): connecting is async, beware race-condition vs. dispose()
    // dispose should await a ready condition
    this._connect(store);
  }
  async _connect(store) {
    //this.log('connect', store);
    const observe = change => this.onChange(change);
    // observe addition of all entities
    await simulateInitialChanges(store, observe);
    // observe future changes (and record ability to stop observation)
    this.off = listenToStore(store, observe);
    // notify that connection is ready
    this._resolveReady();
  }
  async dispose() {
    // sanity check
    if (--observers === 0) {
      console.warn(`all observers disposed (generally a good thing)`);
    }
    // TODO(sjmiles): what if this never resolves?
    await this.ready;
    // stop observing store
    this.off();
    // observe removal of all entities
    await forEachEntity(this.store, value => this.remove(value));
  }
  async onChange(change) {
    StoreObserver.working();
    this.log('onChange', change);
    const {add, remove, data} = change;
    if (data) {
      this.add(data);
    }
    if (add) {
      for (let i=0, record; (record=add[i]); i++) {
        await this.add(record.value);
      }
    }
    if (remove) {
      for (let i=0, record; (record=remove[i]); i++) {
        await this.remove(record.value);
      }
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
  } else {
    const data = await store.get();
    await onchange({data});
  }
};
