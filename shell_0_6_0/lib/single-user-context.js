/*
@license
Copyright (c) 2018 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/

import {SyntheticStores} from './synthetic-stores.js';

//import {Xen} from '../../../lib/xen.js';
const logFactory = (preamble, color, log='log') => console[log].bind(console, `%c${preamble}`, `background: ${color}; color: white; padding: 1px 6px 2px 7px; border-radius: 6px;`);
const log = logFactory('SingleUserContext', '#f2ce14');

export const SingleUserContext = class {
  constructor(storage, context, userid, arcstore, isProfile) {
    this.storage = storage;
    this.context = context;
    this.userid = userid;
    this.arcstore = arcstore;
    this.isProfile = isProfile;
    // we observe `arcid`s and `storageKey`s
    this.observers = {};
    // when we remove an arc from consideration, we have to unobserve storageKeys from that arc
    // `handles` maps an arcid to an array of storageKeys to unobserve
    this.handles = {};
    // promises for async store marshaling
    this.pendingStores = [];
    this.attachArcStore(storage, arcstore);
  }
  async attachArcStore(storage, arcstore) {
    this.observeStore(arcstore, arcstore.id, info => {
      log('arcstore::observer', info);
      if (info.add) {
        info.add.forEach(({value}) => this.addArc(storage, value.rawData));
      } else if (info.remove) {
        info.remove.forEach(({value}) => {
          // TODO(sjmiles): value should contain `rawData.key`, but sometimes there is no `rawData`
          this.removeArc(value.id);
        });
      } else {
        log('arcstore::observer info type not supported: ', info);
      }
    });
  }
  async dispose() {
    // chuck all observers
    Object.values(this.observers).forEach(({key}) => this.unobserve(key));
    // chuck all data
    await this.removeUserEntities(this.context, this.userid, this.isProfile);
  }
  removeArc(arcid) {
    this.unobserve(arcid);
    const handles = this.handles[arcid];
    if (handles) {
      handles.forEach(({storageKey}) => this.unobserve(storageKey));
      this.handles[arcid] = null;
    }
  }
  async addArc(storage, arcmeta) {
    const {deleted, key} = arcmeta;
    if (!deleted) {
      const store = await SyntheticStores.getStore(storage, key);
      await this.observeStore(store, key, info => this.onArcStoreChanged(key, info));
    }
  }
  unobserve(key) {
    const observer = this.observers[key];
    if (observer) {
      this.observers[key] = null;
      //log(`UNobserving [${key}]`);
      observer.store.off('change', observer.cb);
    }
  }
  async observeStore(store, key, cb) {
    if (!this.observers[key]) {
      //log(`observing [${key}]`);
      // TODO(sjmiles): create synthetic store `change` records from the initial state
      // SyntheticCollection has `toList` but is `!type.isCollection`,
      if (store.toList) {
        const data = await store.toList();
        if (data && data.length) {
          const add = data.map(value => ({value}));
          cb({add});
        }
      } else if (store.type.isEntity) {
        const data = await store.get();
        if (data) {
          cb({data});
        }
      }
      this.observers[key] = {key, store, cb: store.on('change', cb, this)};
    }
  }
   onArcStoreChanged(arcid, info) {
    log('Synthetic-store change event (onArcStoreChanged):', info);
    // TODO(sjmiles): synthesize add/remove records from data record
    //   this._patchArcDataInfo(arcid, info);
    // process add/remove stream
    if (info.add) {
      info.add.forEach(async add => {
        let handle = add.value;
        if (!handle) {
          log('`add` record has no `value`, applying workaround', add);
          handle = add;
        }
        if (handle) { //} && handle.tags.length) {
          //handle.tags.length && log('observing handle', handle.tags);
          const store = await SyntheticStores.getHandleStore(handle);
          await this.observeStore(store, handle.storageKey, info => this.updateHandle(arcid, handle, info));
        }
      });
    }
    if (info.remove) {
      info.remove.forEach(async remove => {
        const handle = remove.value;
        if (handle) {
          //log('UNobserving handle', handle);
          this._unobserve(handle.storageKey);
        }
      });
    }
  }
  async updateHandle(arcid, handle, info) {
    const {context, userid, isProfile} = this;
    const tags = handle.tags ? handle.tags.join('-') : '';
    if (tags) {
      log('updateHandle', tags/*, info*/);
      const type = handle.type.isCollection ? handle.type : handle.type.collectionOf();
      const id = SyntheticStores.snarfId(handle.storageKey);
      //
      const shareid = `${tags}|${id}|from|${userid}|${arcid}`;
      const shortid = `${(isProfile ? `PROFILE` : `FRIEND`)}_${tags}`;
      const storeName = shortid;
      const storeId = isProfile ? shortid : shareid;
      log('share id:', storeId);
      const store = await this.getShareStore(context, type, storeName, storeId, handle.tags);
      //
      const boxStoreId = `BOXED_${tags}`;
      const boxDataId = `${userid}|${arcid}`;
      //const boxId = `${tags}|${boxDataId}`;
      log('box ids:', boxStoreId, boxDataId/*, boxId*/);
      const boxStore = await this.getShareStore(context, type, boxStoreId, boxStoreId, [boxStoreId]);
      //
      // TODO(sjmiles): no mutation
      if (handle.type.isEntity) {
        if (info.data) {
          // TODO(sjmiles): in the absence of data mutation, when entity changes
          // it gets an entirely new id, so we cannot use entity id to track this
          // entity in boxed stores. However as this entity is a Highlander for this
          // user and arc (by virtue of not being in a Collection) we can synthesize
          // a stable id.
          info.data.id = boxDataId;
          this.unshareEntities(userid, store, boxStore, info.data);
          this.shareEntities(userid, store, boxStore, info.data);
        }
      } else if (info.add || info.remove) {
        info.remove && info.remove.forEach(remove => this.unshareEntities(userid, store, boxStore, [remove.value]));
        info.add && info.add.forEach(add => this.shareEntities(userid, store, boxStore, [add.value]));
      } else if (info.data) {
        this.shareEntities(userid, store, boxStore, info.data);
      }
    }
  }
  async getShareStore(context, type, name, id, tags) {
    // TODO(sjmiles): cache and return promises in case of re-entrancy
    let promise = this.pendingStores[id];
    if (!promise) {
      promise = new Promise(async (resolve) => {
        const store = await context.findStoreById(id);
        if (store) {
          resolve(store);
        } else {
          const store = await context.createStore(type, name, id, tags);
          resolve(store);
        }
      });
      this.pendingStores[id] = promise;
    }
    return promise;
  }
  async shareEntities(userid, shareStore, boxStore, data) {
    if (data) {
      this.storeEntitiesWithUid(shareStore, data, userid);
      boxStore.idMap = this.storeEntitiesWithUid(boxStore, data, userid);
    }
  }
  async unshareEntities(userid, shareStore, boxStore, data) {
    if (data) {
      this.removeEntitiesWithUid(shareStore, data, userid);
      this.removeEntitiesWithUid(boxStore, data, userid);
    }
  }
  storeEntitiesWithUid(store, data, uid) {
    const ids = [];
    const storeDecoratedEntity = ({id, rawData}, uid) => {
      const decoratedId = `${id}:uid:${uid}`;
      ids.push({id: decoratedId, rawData});
      //console.log('pushing data to store');
      if (store.type.isCollection) {
        // FIXME: store.generateID may not be safe (session scoped)?
        store.store({id: decoratedId, rawData}, [store.generateID()]);
      } else {
        store.set({id: decoratedId, rawData});
      }
    };
    if (data && data.id) {
      storeDecoratedEntity(data, uid);
    } else {
      Object.values(data).forEach(entity => entity && storeDecoratedEntity(entity, uid));
    }
    return ids;
  }
  removeEntitiesWithUid(store, data, uid) {
    const removeDecoratedEntity = ({id, rawData}, uid) => {
      const decoratedId = `${id}:uid:${uid}`;
      if (store.type.isCollection) {
        store.remove(decoratedId);
      }
    };
    if (store.type.isCollection) {
      if (Array.isArray(data)) {
        data.forEach(entity => entity && removeDecoratedEntity(entity, uid));
      } else if (data && data.id) {
        removeDecoratedEntity(data, uid);
      }
    } else {
      store.clear();
    }
  }
  async removeEntities(context) {
    this.removeUserEntities(context, 'all', true);
  }
  async removeUserEntities(context, userid, isProfile) {
    log(`removing entities for [${userid}]`);
    const jobs = [];
    for (let i=0, store; (store=context.stores[i]); i++) {
      // SYSTEM_users persists across users
      if (store.id !== 'SYSTEM_users') {
        jobs.push(this.removeUserStoreEntities(userid, store, isProfile));
      }
    }
    await Promise.all(jobs);
  }
  async removeUserStoreEntities(userid, store, isProfile) {
    log(`scanning [${userid}] [${store.id}] (${store.toList ? 'collection' : 'variable'})`);
    //const tags = context.findStoreTags(store);
    if (store.toList) {
      const entities = await store.toList();
      entities.forEach(entity => {
        const uid = entity.id.split('uid:').pop().split('|').shift();
        if (isProfile || uid === userid) {
          log(`  REMOVE `, entity.id);
          // TODO(sjmiles): _removeUserStoreEntities is strangely re-entering
          //  (1) `remove` fires synchronous change events
          //  (2) looks like there are double `remove` events in the queue. Bug?
          // In general, to avoid interleaving we'll probably need to
          // use a stack to process changes async to receiving them.
          // Parallel processing works as of now ... feature?
          store.remove(entity.id);
        }
      });
    }
    else {
      const uid = store.id.split('|').slice(-2, -1).pop();
      if (isProfile || uid === userid) {
        log(`  CLEAR store`);
        store.clear();
      }
    }
  }
};
