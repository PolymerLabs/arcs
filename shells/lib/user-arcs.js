/*
@license
Copyright (c) 2018 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/

import {Const} from '../configuration/constants.js';
import {SyntheticStores} from './synthetic-stores.js';
// TODO(sjmiles): breaks cross-platform
import {logFactory} from '../../build/platform/log-node.js';

const log = logFactory('UserArcs', '#4f0433');
const warn = logFactory('UserArcs', '#4f0433', 'warn');

export class UserArcs {
  constructor(env, storage, userid, callback) {
    this.contextWait = 3000;
    SyntheticStores.init(env);
    this.updateArcsStore(storage, userid, callback);
  }
  async updateArcsStore(storage, userid, cb) {
    // attempt to marshal arcs-store for this user
    const arcsStore = await this.fetchArcsStore(storage, userid);
    if (arcsStore) {
      // TODO(sjmiles): plop arcsStore into state early for updateUserContext, usage is weird
      this.foundArcsStore(arcsStore, cb);
    } else {
      // retry after a bit
      setTimeout(() => this.updateArcsStore(storage, userid), this.contextWait);
    }
  }
  async fetchArcsStore(storage, userid) {
    // TODO(sjmiles): marshalling of arcs-store arc id from userid should be elsewhere
    const store = await SyntheticStores.getArcsStore(storage, `${userid}${Const.launcherSuffix}`);
    if (store) {
      log(`marshalled arcsStore for [${userid}]`);
      return store;
    }
    warn(`failed to marshal arcsStore for [${userid}][${storage}]`);
  }
  async foundArcsStore(store, cb) {
    log('foundArcsStore', Boolean(store));
    //
    let values;
    try {
      values = await store.toList();
    } catch (x) {
      values = [];
    }
    //
    store.on('change', info => this.arcsStoreChange(info, cb), this);
    //
    const info = {add: []};
    values.forEach(value => info.add.push({value}));
    this.arcsStoreChange(info, cb);
  }
  arcsStoreChange(info, cb) {
    log('arsStoreChange');
    cb && cb(info);
  }
}
