/**
 * @license
 * Copyright (c) 2018 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {logsFactory} from '../../build/platform/logs-factory.js';
import {Const} from '../configuration/constants.js';
import {SyntheticStores} from '../lib/synthetic-stores.js';

const {log, warn} = logsFactory('UserArcs', '#4f0433');

export class UserArcs {
  constructor(storage, userid) {
    SyntheticStores.init();
    this.values = [];
    this.listeners = [];
    this.contextWait = 3000;
    this.updateArcsStore(storage, userid);
  }
  async subscribe(listener) {
    if (this.listeners.indexOf(listener) < 0) {
      await this.publishInitialChanges([listener]);
      this.listeners.push(listener);
      this.publish(this.values, [listener]);
    }
  }
  publish(changes, listeners) {
    // convert {add:[], remove:[]} to [{add, remove}]
    if (changes.add) {
      changes.add.forEach(add => this._publish({add: add.value}, listeners));
    }
    if (changes.remove) {
      changes.remove.forEach(remove => this._publish({remove: remove.value}, listeners));
    }
  }
  async publishInitialChanges(listeners) {
    const changes = {add: []};
    if (this.store) {
      const values = await this.store.toList();
      values.forEach(value => this._publish({add: value}, listeners));
    }
    return changes;
  }
  _publish(change, listeners) {
    if (!change.add || !change.add.rawData.deleted) {
      listeners.forEach(listener => listener(change));
    }
  }
  async updateArcsStore(storage, userid) {
    // attempt to marshal arcs-store for this user
    this.store = await this.fetchArcsStore(storage, userid);
    if (this.store) {
      // TODO(sjmiles): plop arcsStore into state early for updateUserContext, usage is weird
      this.foundArcsStore(this.store);
    } else {
      // retry after a bit
      setTimeout(() => this.updateArcsStore(storage, userid), this.contextWait);
    }
  }
  async fetchArcsStore(storage, userid) {
    // TODO(sjmiles): marshalling of arcs-store arc id from userid should be elsewhere
    const store = await SyntheticStores.getArcsStore(storage, Const.DEFAULT.launcherId);
    if (store) {
      log(`marshalled arcsStore for [${userid}]`);
      return store;
    }
    warn(`failed to marshal arcsStore for [${userid}][${storage}]`);
  }
  async foundArcsStore(store) {
    log('foundArcsStore', Boolean(store));
    await this.publishInitialChanges(this.listeners);
    store.on(changes => this.arcsStoreChange(changes));
  }
  arcsStoreChange(changes) {
    this.publish(changes, this.listeners);
  }
}
