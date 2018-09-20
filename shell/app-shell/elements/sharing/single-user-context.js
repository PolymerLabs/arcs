/*
@license
Copyright (c) 2018 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/

import Xen from '../../../components/xen/xen.js';
import Arcs from '../../../lib/arcs.js';
import Firebase from '../../../lib/firebase.js';
import {Field} from '../fb-data/Field.js';

const log = Xen.logFactory('SingleUserContext', '#6f2453');

const storage = new Arcs.StorageProviderFactory('shell');
//
const getSyntheticArcsStorageKey = arcid =>
  `synthetic://arc/handles/${Firebase.storageKey}/arcs/${arcid}/serialization`;
//
const makeId = () => `id${Math.random()}`;
const syntheticConnect = async storageKey =>
  storage.connect(makeId(), null, getSyntheticArcsStorageKey(storageKey));
const storeConnect = async (type, storageKey) =>
  storage.connect(`id${Math.random()}`, type, storageKey);
//
const stores = {};
const getSyntheticStore = async storageKey =>
  stores[storageKey] || (stores[storageKey] = await syntheticConnect(storageKey));
const getHandleStore = async ({type, storageKey}) =>
  stores[storageKey] || (stores[storageKey] = await storeConnect(type, storageKey));
//
const snarfId = key => {
  return key.split('/').pop();
};

const SingleUserContext = class {
  constructor(context, userid, isProfile) {
    this.isProfile = isProfile;
    this.context = context;
    this.userid = userid;
    // we observe `arcid`s and `storageKey`s
    this.observers = {};
    // when we remove an arc from consideration, we have to unobserve storageKeys from that arc
    // `handles` maps an arcid to an array of storageKeys to unobserve
    this.handles = {};
    this.field = new Field(null, `/users/${userid}`, userid, this._userSchema).activate();
  }
  dispose() {
    // chuck all observers
    Object.values(this.observers).forEach(({key}) => this._unobserve(key));
    // chuck all data
    this._removeUserEntities(this.context, this.userid, this.isProfile);
  }
  get _userSchema() {
    return {
      arcs: {
        '*': {
          $key: (parent, key, datum) => ({
            $join: {
              path: `/arcs/${parent}`,
              schema: {
                $changed: field => this._onShareChanged(field)
              }
            }
          })
        }
      }
    };
  }
  _onShareChanged(share) {
    // TODO(sjmiles): schedule field processing to avoid re-entrancy
    //log('SingleUserContext:onShareChanged', share);
    const arcid = share.parent.key;
    const userid = share.parent.path.split('/')[2];
    const meta = share.data.metadata || Object;
    if (share.disposed || meta.share < 2) {
      //log(`removing arc [${arcid}] from [${userid}] sharing (share level: ${meta.share})`);
      this._removeArc(arcid);
    }
    if (meta.share > 1) {
      if (!share.disposed) {
        log(`found shared arc [${arcid}] from [${userid}] (share level: ${meta.share})`);
        this._addArc(arcid);
      }
    }
  }
  _removeArc(arcid) {
    this._unobserve(arcid);
    const handles = this.handles[arcid];
    if (handles) {
      handles.forEach(({storageKey}) => this._unobserve(storageKey));
    }
  }
  async _addArc(arcid) {
    const store = await getSyntheticStore(arcid);
    await this._observeStore(store, arcid, info => this._onArcStoreChanged(arcid, info));
  }
  _onArcStoreChanged(arcid, info) {
    log('onArcStoreChanged', info);
    // TODO(sjmiles): synthesize add/remove records from data record
    this._patchArcDataInfo(arcid, info);
    // process add/remove stream
    if (info.add) {
      info.add.forEach(async add => {
        const handle = add.value;
        log('observing handle', handle);
        const store = await getHandleStore(handle);
        await this._observeStore(store, handle.storageKey, info => this._updateHandle(arcid, handle, info));
      });
    }
    if (info.remove) {
      info.remove.forEach(async remove => {
        const handle = remove.value;
        log('UNobserving handle', handle);
        this._unobserve(handle.storageKey);
      });
    }
  }
  _patchArcDataInfo(arcid, info) {
    const old = this.handles[arcid] || [];
    const handles = this.handles[arcid] = [];
    // TODO(sjmiles): synthesize add/remove records from data record
    if (info.data) {
      const matchKey = handle => ({storageKey}) => storageKey === handle.storageKey;
      info.add = [];
      info.data.forEach(handle => {
        handles.push(handle);
        if (!old.find(matchKey(handle))) {
          info.add.push({value: handle});
        }
      });
      info.remove = [];
      old.forEach(handle => {
        if (!handles.find(matchKey(handle))) {
          info.remove.push(handle);
        }
      });
    }
  }
  async _observeStore(store, key, cb) {
    // SyntheticCollection has `toList` but is `!type.isCollection`,
    if (store.toList) {
    //if (store.type.isCollection) {
      const data = await store.toList();
      if (data && data.length) {
        const add = data.map(value => ({value}));
        cb({add});
      }
    }
    if (store.type.isEntity) {
      const data = await store.get();
      if (data) {
        cb({data});
      }
    }
    // TODO(sjmiles): go async because cb can be re-entrant while waiting on `createStore`
    // which can lead to multiple stores being created with the same id
    // ... instead, fix this by building a wrapper for `createStore` that can deal with pending requests.
    setTimeout(() => {
      this._observe(store, key, info => cb(info));
    }, 1);
  }
  _observe(store, key, cb) {
    if (!this.observers[key]) {
      log(`observing [${key}]`);
      this.observers[key] = {key, store, cb: store.on('change', cb, this)};
    }
  }
  _unobserve(key) {
    const observer = this.observers[key];
    if (observer) {
      this.observers[key] = null;
      log(`UNobserving [${key}]`);
      observer.store.off('change', observer.cb);
    }
  }
  async _updateHandle(arcid, handle, info) {
    log('_updateHandle', info);
    const {context, userid, isProfile} = this;
    const tags = handle.tags ? handle.tags.join('-') : '';
    if (tags) {
      const type = handle.type.isCollection ? handle.type : handle.type.collectionOf();
      //
      //const id = handle.type.isEntity ? 'entity' : snarfId(handle.storageKey);
      const id = snarfId(handle.storageKey);
      //
      const shareid = `${tags}|${id}|from|${userid}|${arcid}`;
      const shortid = `${(isProfile ? `PROFILE` : `FRIEND`)}_${tags}`;
      log('share ids:', shortid, shareid);
      //
      const storeName = shortid;
      const storeId = isProfile ? shortid : shareid;
      const store = await this._getShareStore(context, type, storeName, storeId, handle.tags, userid);
      //
      const boxStoreId = `BOXED_${tags}`;
      const boxDataId = `${userid}|${arcid}`;
      const boxId = `${tags}|${boxDataId}`;
       log('box ids:', boxStoreId, boxDataId, boxId);
      const boxStore = await this._getShareStore(context, type, boxStoreId, boxStoreId, [boxStoreId], userid);
      //
      // TODO(sjmiles): no mutation
      if (handle.type.isEntity) {
        if (info.data) {
          // TODO(sjmiles): in the absence of data mutation, when entity changes
          // it gets an entirely new id, so we cannot use entity id to track this
          // entity in boxed stores. However as this entity is a Highlander for this
          // user and arc (by virtue of not being a Collection) we can synthesize
          // a stable id.
          info.data.id = boxDataId;
          this._removeEntities(userid, store, boxStore, info.data);
          this._shareEntities(userid, store, boxStore, info.data);
        }
      } else if (info.add || info.remove) {
        info.add && info.add.forEach(add => this._shareEntities(userid, store, boxStore, [add.value]));
        info.remove && info.remove.forEach(remove => this._removeEntities(userid, store, boxStore, [remove.value]));
      } else if (info.data) {
        this._shareEntities(userid, store, boxStore, info.data);
      }
    }
  }
  async _getShareStore(context, type, name, id, tags, ownerid) {
    return (await context.findStoreById(id)) || (await context.createStore(type, name, id, tags));
  }
  async _shareEntities(userid, shareStore, boxStore, data) {
    if (data) {
      this._storeEntitiesWithUid(shareStore, data, userid);
      boxStore.idMap = this._storeEntitiesWithUid(boxStore, data, userid);
    }
  }
  async _removeEntities(userid, shareStore, boxStore, data) {
    if (data) {
      this._removeEntitiesWithUid(shareStore, data, userid);
      this._removeEntitiesWithUid(boxStore, data, userid);
    }
  }
  _storeEntitiesWithUid(store, data, uid) {
    const ids = [];
    const storeDecoratedEntity = ({id, rawData}, uid) => {
      const decoratedId = `${id}:uid:${uid}`;
      ids.push({id: decoratedId, rawData});
      if (store.type.isCollection) {
        // FIXME: store.generateID may not be safe (session scoped)?
        store.store({id: decoratedId, rawData}, [store.generateID()]);
      } else {
        store.set({id: decoratedId, rawData});
      }
    };
    if (data.id) {
      storeDecoratedEntity(data, uid);
    } else {
      Object.values(data).forEach(entity => storeDecoratedEntity(entity, uid));
    }
    return ids;
  }
  _removeEntitiesWithUid(store, data, uid) {
    const removeDecoratedEntity = ({id, rawData}, uid) => {
      const decoratedId = `${id}:uid:${uid}`;
      if (store.type.isCollection) {
        store.remove(decoratedId);
      }
    };
    if (store.type.isCollection) {
      if (Array.isArray(data)) {
        data.forEach(entity => removeDecoratedEntity(entity, uid));
      } else {
        removeDecoratedEntity(data, uid);
      }
    } else {
      store.clear();
    }
  }
  async _removeUserEntities(context, userid, isProfile) {
    log(`removing entities for [${userid}]`);
    const jobs = [];
    for (let i=0, store; (store=context.stores[i]); i++) {
      jobs.push(this._removeUserStoreEntities(userid, store, isProfile));
    }
    await Promise.all(jobs);
  }
  async _removeUserStoreEntities(userid, store, isProfile) {
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

export {SingleUserContext};
