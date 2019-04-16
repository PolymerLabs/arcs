/*
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import {now} from '../../build/platform/date-web.js';
import {logFactory} from '../../build/platform/log-web.js';
import {Utils} from '../lib/runtime/utils.js';
import {Stores} from '../lib/runtime/stores.js';
import {RamSlotComposer} from '../lib/components/ram-slot-composer.js';
import {ArcHost} from '../lib/components/arc-host.js';
import {Schemas} from './schemas.js';

const log = logFactory('Context');

export const Context = class {
  constructor(storage) {
    this.isReady = new Promise((resolve, reject) => this.readyResolver = resolve);
    this.initContext(storage);
  }
  async initContext(storage) {
    this.context = await Utils.parse('');
    await this.initAddressStore(this.context);
    await this.initPipesArc(storage);
    this.readyResolver();
  }
  async initAddressStore(context) {
    const store = await Stores.create(context, {
      name: 'pipe-entities',
      id: 'pipe-entities',
      schema: Schemas.PipeEntity,
      isCollection: true,
      tags: null,
      storageKey: null
    });
    this.contextEntityStore = store;
    //console.log(store);
  }
  async initPipesArc(storage) {
    log('initPipesArc');
    const host = new ArcHost(null, storage, new RamSlotComposer());
    const id = 'pipes-arc';
    const manifest = `import 'https://$particles/PipeApps/BackgroundPipes.recipes'`;
    this.pipesArc = await host.spawn({id, manifest});
    // TODO(sjmiles): findById would be better,
    // but I can't get the id to materialize via manifest
    this.entityStore = this.pipesArc._stores[0];
    if (this.entityStore) {
      await this.entityStoreChange(await this.getInitialChange(this.entityStore));
      this.entityStore.on('change', info => this.entityStoreChange(info), this);
    } else {
      log('initPipesArc: failed to find entityStore');
    }
    //dumpStores([this.entityStore]);
  }
  async getInitialChange(store) {
    const change = {add: []};
    const values = await store.toList();
    values.forEach(value => change.add.push({value}));
    return change;
  }
  async entityStoreChange(change) {
    //console.log(change);
    await this.cloneStoreChange(change, this.contextEntityStore);
    //dumpStores([this.contextEntityStore]);
  }
  async cloneStoreChange(change, store) {
    if (store && change.add) {
      await Promise.all(change.add.map(async add => {
        await store.store(add.value, [now()]);
      }));
    }
  }
};

const dumpStores = async stores => {
  //console.log(`stores dump, length = ${stores.length}`);
  await Promise.all(stores.map(async (store, i) => {
    if (store) {
      const accessor = store.type.isCollection ? 'toList' : 'get';
      const value = await store[accessor]();
      log(`store #${i}:`, store.id, value);
    }
  }));
};
